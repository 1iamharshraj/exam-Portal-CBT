import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Maximize,
  ShieldCheck,
  Camera,
  Monitor,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { ITest, IQuestion, ITestAttempt } from '@exam-portal/shared';
import { QuestionStatus, AttemptStatus } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';
import { MathRenderer } from '@/components/common/math-renderer';
import {
  detectVM,
  checkBatteryVM,
  createDevToolsDetector,
  setupPrintScreenBlocker,
  createWebcamProctor,
  type ProctoringEvent,
} from '@/lib/proctoring';
import {
  createWatermarkOverlay,
  removeWatermarkOverlay,
  generateSessionHash,
  extractRollNumber,
  type WatermarkConfig,
} from '@/lib/watermark';
import { useAuthStore } from '@/stores/auth.store';

// ---------------------------------------------------------------------------
// Pre-exam verification check types
// ---------------------------------------------------------------------------
interface VerificationCheck {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  critical: boolean; // If true, blocks exam start
  message?: string;
}

// NTA-style colors
const STATUS_COLORS: Record<string, string> = {
  [QuestionStatus.NOT_VISITED]: 'bg-gray-200 text-gray-600',
  [QuestionStatus.NOT_ANSWERED]: 'bg-red-500 text-white',
  [QuestionStatus.ANSWERED]: 'bg-green-500 text-white',
  [QuestionStatus.MARKED_FOR_REVIEW]: 'bg-purple-500 text-white',
  [QuestionStatus.ANSWERED_AND_MARKED]: 'bg-purple-500 text-white ring-2 ring-green-500',
};

export function ExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [attempt, setAttempt] = useState<ITestAttempt | null>(null);
  const [test, setTest] = useState<ITest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [webcamActive, setWebcamActive] = useState(false);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamProctorRef = useRef<ReturnType<typeof createWebcamProctor> | null>(null);
  const watermarkRef = useRef<HTMLDivElement | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Pre-exam verification state
  const [verificationChecks, setVerificationChecks] = useState<VerificationCheck[]>([
    { id: 'fullscreen', label: 'Fullscreen Mode', description: 'Browser can enter fullscreen', status: 'pending', critical: true },
    { id: 'vm', label: 'Environment Check', description: 'Not running in a virtual machine', status: 'pending', critical: true },
    { id: 'webcam', label: 'Webcam Access', description: 'Camera is available and permitted', status: 'pending', critical: false },
    { id: 'devtools', label: 'Developer Tools', description: 'DevTools are closed', status: 'pending', critical: true },
    { id: 'screen', label: 'Display Check', description: 'Single monitor detected', status: 'pending', critical: false },
    { id: 'clipboard', label: 'Clipboard Protection', description: 'Copy/paste will be blocked', status: 'pending', critical: false },
  ]);
  const [verificationRunning, setVerificationRunning] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);
  const verifyVideoRef = useRef<HTMLVideoElement | null>(null);
  const verifyStreamRef = useRef<MediaStream | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [numericalInput, setNumericalInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const questionTimerRef = useRef(0);

  const fetchAttempt = useCallback(async () => {
    if (!attemptId) return;
    setIsLoading(true);
    try {
      const data = await testAttemptService.getAttempt(attemptId);
      setAttempt(data);
      const testData = (data as any).testId as ITest;
      setTest(testData);
      setActiveSectionIdx(data.currentSectionIndex || 0);
      setActiveQuestionIdx(data.currentQuestionIndex || 0);

      // Calculate time remaining
      const elapsed = (Date.now() - new Date(data.startedAt).getTime()) / 1000;
      const totalSeconds = testData.totalTimeMinutes * 60;
      setTimeLeft(Math.max(0, totalSeconds - elapsed));
    } catch {
      toast.error('Failed to load exam');
      navigate('/student/tests');
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, navigate]);

  useEffect(() => {
    fetchAttempt();
  }, [fetchAttempt]);

  // Countdown timer
  useEffect(() => {
    if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
      questionTimerRef.current += 1;
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt?.status]);

  // Poll attempt status to detect force-submit by proctor
  useEffect(() => {
    if (!attemptId || !examStarted || !attempt || attempt.status !== AttemptStatus.IN_PROGRESS) return;

    const pollInterval = setInterval(async () => {
      try {
        const latest = await testAttemptService.getAttempt(attemptId);
        if (latest.status !== AttemptStatus.IN_PROGRESS) {
          // Proctor force-submitted or status changed externally
          setAttempt(latest);
          toast.error('Your test has been submitted by the invigilator.', { duration: 10000 });
          // Exit fullscreen
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
        }
      } catch {
        // Network error — skip this poll cycle
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(pollInterval);
  }, [attemptId, examStarted, attempt?.status]);

  // Load current question's response when navigating
  useEffect(() => {
    if (!attempt || !test) return;
    const section = test.sections[activeSectionIdx];
    if (!section) return;
    const questions = section.questionIds as unknown as IQuestion[];
    const q = questions[activeQuestionIdx];
    if (!q) return;

    const qId = typeof q === 'string' ? q : q._id;
    const response = attempt.responses.find(
      (r) => r.questionId === qId && r.sectionIndex === activeSectionIdx,
    );

    setSelectedOptions(response?.selectedOptions || []);
    setNumericalInput(
      response?.numericalAnswer !== undefined ? String(response.numericalAnswer) : '',
    );
    questionTimerRef.current = response?.timeSpent || 0;
  }, [activeSectionIdx, activeQuestionIdx, attempt, test]);

  // --- Anti-malpractice measures ---
  const violationCountRef = useRef(0);
  const MAX_VIOLATIONS = 5;
  const autoSubmitTriggeredRef = useRef(false);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  // --- Pre-exam verification runner ---
  const updateCheck = useCallback((id: string, update: Partial<VerificationCheck>) => {
    setVerificationChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...update } : c)),
    );
  }, []);

  const runVerification = useCallback(async () => {
    setVerificationRunning(true);

    // 1. Fullscreen capability check
    updateCheck('fullscreen', { status: 'running' });
    try {
      await document.documentElement.requestFullscreen();
      // Immediately exit — we'll re-enter on exam start
      await document.exitFullscreen().catch(() => {});
      updateCheck('fullscreen', { status: 'passed', message: 'Fullscreen supported' });
    } catch {
      updateCheck('fullscreen', {
        status: 'failed',
        message: 'Browser blocked fullscreen. Allow fullscreen permission and retry.',
      });
    }

    // 2. VM / Environment check
    updateCheck('vm', { status: 'running' });
    const vmResult = detectVM();
    const batterySignal = await checkBatteryVM();
    if (batterySignal) vmResult.signals.push(batterySignal);
    const vmIsDetected = vmResult.signals.length >= 2;
    updateCheck('vm', {
      status: vmIsDetected ? 'failed' : 'passed',
      message: vmIsDetected
        ? `VM detected (${vmResult.confidence}): ${vmResult.signals.slice(0, 2).join('; ')}`
        : 'Physical machine confirmed',
    });

    // 3. Webcam check
    updateCheck('webcam', { status: 'running' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      // Show preview in verification screen
      if (verifyVideoRef.current) {
        verifyVideoRef.current.srcObject = stream;
        await verifyVideoRef.current.play();
      }
      verifyStreamRef.current = stream;
      updateCheck('webcam', { status: 'passed', message: 'Camera accessible' });
    } catch {
      updateCheck('webcam', {
        status: 'warning',
        message: 'Camera denied — proctoring will be limited',
      });
    }

    // 4. DevTools check
    updateCheck('devtools', { status: 'running' });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const devToolsOpen = widthDiff > 160 || heightDiff > 160;
    updateCheck('devtools', {
      status: devToolsOpen ? 'failed' : 'passed',
      message: devToolsOpen
        ? 'Developer Tools are open. Close them and retry.'
        : 'DevTools closed',
    });

    // 5. Display/screen check
    updateCheck('screen', { status: 'running' });
    let multiScreen = false;
    try {
      if ('getScreenDetails' in window) {
        const details = await (window as any).getScreenDetails();
        multiScreen = details.screens.length > 1;
      }
    } catch {
      // Permission denied — skip
    }
    updateCheck('screen', {
      status: multiScreen ? 'warning' : 'passed',
      message: multiScreen
        ? 'Multiple monitors detected — disconnect extras for best security'
        : 'Single display confirmed',
    });

    // 6. Clipboard (always passes — it's enforced at runtime)
    updateCheck('clipboard', { status: 'passed', message: 'Will be blocked during exam' });

    setVerificationRunning(false);
    setVerificationDone(true);
  }, [updateCheck]);

  const handleStartExam = useCallback(() => {
    // Stop verification camera preview (exam will start its own)
    if (verifyStreamRef.current) {
      verifyStreamRef.current.getTracks().forEach((t) => t.stop());
      verifyStreamRef.current = null;
    }
    enterFullscreen();
    setExamStarted(true);
  }, [enterFullscreen]);

  // --- Continuous fullscreen enforcement during exam ---
  useEffect(() => {
    if (!examStarted || !attempt || attempt.status !== AttemptStatus.IN_PROGRESS) return;

    let reEntryTimeout: ReturnType<typeof setTimeout> | null = null;

    const enforceFullscreen = () => {
      if (!document.fullscreenElement) {
        // Give a brief 2s window, then force re-enter
        reEntryTimeout = setTimeout(() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          }
        }, 2000);
      }
    };

    document.addEventListener('fullscreenchange', enforceFullscreen);

    // Also check periodically in case the event was missed
    const periodicCheck = setInterval(() => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    }, 5000);

    return () => {
      document.removeEventListener('fullscreenchange', enforceFullscreen);
      if (reEntryTimeout) clearTimeout(reEntryTimeout);
      clearInterval(periodicCheck);
    };
  }, [examStarted, attempt?.status]);

  // Auto-submit when violations exceed limit
  const triggerAutoSubmit = useCallback(async () => {
    if (autoSubmitTriggeredRef.current || !attemptId) return;
    autoSubmitTriggeredRef.current = true;
    toast.error('Test auto-submitted due to repeated violations.', { duration: 10000 });
    try {
      const result = await testAttemptService.submitTest(attemptId);
      setAttempt(result);
    } catch {
      // ignore
    }
  }, [attemptId]);

  const recordViolation = useCallback((reason: string, type: string = 'other') => {
    violationCountRef.current += 1;
    const count = violationCountRef.current;
    const remaining = MAX_VIOLATIONS - count;

    // Report violation to backend for proctor dashboard
    if (attemptId) {
      testAttemptService.recordViolation(attemptId, { type, message: reason }).catch(() => {});
    }

    if (count >= MAX_VIOLATIONS) {
      triggerAutoSubmit();
    } else if (remaining <= 2) {
      toast.error(
        `${reason} (${count}/${MAX_VIOLATIONS}). ${remaining} more and your test will be auto-submitted!`,
        { duration: 8000 },
      );
    } else {
      toast.warning(
        `${reason} (${count}/${MAX_VIOLATIONS}). Do not leave the exam window.`,
        { duration: 5000 },
      );
    }
  }, [triggerAutoSubmit, attemptId]);

  useEffect(() => {
    if (!examStarted || !attempt || attempt.status !== AttemptStatus.IN_PROGRESS) return;

    // 1. Tab switch via visibility API (catches tab changes & minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('Tab switch detected', 'tab_switch');
      }
    };

    // 2. Window blur — catches Alt+Tab, clicking other windows/monitors
    let blurTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleWindowBlur = () => {
      // Small delay to avoid false positives from browser dialogs (confirm, alert)
      blurTimeout = setTimeout(() => {
        // Only count if visibility didn't already fire (avoid double-counting)
        if (!document.hidden) {
          recordViolation('Window focus lost — possible app/display switch', 'focus_lost');
        }
      }, 300);
    };
    const handleWindowFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    // 3. Fullscreen exit detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('Exited fullscreen mode', 'fullscreen_exit');
      }
    };

    // 4. Detect multiple screens
    const checkMultipleScreens = async () => {
      try {
        if ('getScreenDetails' in window) {
          const screenDetails = await (window as any).getScreenDetails();
          if (screenDetails.screens.length > 1) {
            toast.error(
              'Multiple displays detected. Please disconnect extra monitors during the exam.',
              { duration: 10000 },
            );
          }
        } else if (window.screen && window.screen.availWidth > window.screen.width * 1.5) {
          toast.warning('Extended display may be detected.', { duration: 6000 });
        }
      } catch {
        // Permission denied or API not available — skip
      }
    };
    checkMultipleScreens();

    // 5. Prevent copy/paste/cut
    const blockClipboard = (e: Event) => {
      e.preventDefault();
      toast.warning('Copy/paste is disabled during the exam.', { duration: 2000 });
    };

    // 6. Block right-click context menu
    const blockContextMenu = (e: Event) => {
      e.preventDefault();
    };

    // 7. Block keyboard shortcuts
    const blockShortcuts = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'u', 'a', 'p', 's'].includes(key)) ||
        e.key === 'F12' ||
        e.key === 'F5' ||
        e.key === 'F11' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 8. Block text selection via CSS
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // 9. Prevent navigating away
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    // 10. DevTools detection
    const devToolsDetector = createDevToolsDetector(() => {
      recordViolation('Developer tools detected', 'devtools');
    });
    devToolsDetector.start();

    // 11. Print Screen blocker (black overlay on screenshot attempts)
    const cleanupPrintScreen = setupPrintScreenBlocker();

    // 12. Webcam proctoring
    let webcamProctor: ReturnType<typeof createWebcamProctor> | null = null;
    if (webcamVideoRef.current) {
      webcamProctor = createWebcamProctor(
        webcamVideoRef.current,
        (event: ProctoringEvent) => {
          if (event.type === 'no_face') {
            recordViolation('No face detected — look at the screen', 'no_face');
          } else if (event.type === 'multiple_faces') {
            recordViolation('Multiple faces detected', 'multiple_faces');
          } else if (event.type === 'face_turned') {
            toast.warning('Please face the screen directly.', { duration: 3000 });
          } else if (event.type === 'camera_denied') {
            toast.error('Camera access denied. Webcam proctoring is unavailable.', { duration: 8000 });
          }
        },
      );
      webcamProctorRef.current = webcamProctor;
      webcamProctor.start().then((ok) => setWebcamActive(ok));
    }

    // 13. Anti-screenshot watermark overlay
    let watermarkEl: HTMLDivElement | null = null;
    if (user) {
      const config: WatermarkConfig = {
        studentName: `${user.firstName} ${user.lastName}`,
        rollNumber: extractRollNumber(user._id),
        sessionHash: generateSessionHash(),
        timestamp: new Date().toISOString(),
      };
      watermarkEl = createWatermarkOverlay(config, 0.04);
      document.body.appendChild(watermarkEl);
      watermarkRef.current = watermarkEl;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockShortcuts, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockShortcuts, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (blurTimeout) clearTimeout(blurTimeout);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      devToolsDetector.stop();
      cleanupPrintScreen();
      if (watermarkEl) {
        removeWatermarkOverlay(watermarkEl);
        watermarkRef.current = null;
      }
      if (webcamProctor) {
        webcamProctor.stop();
        webcamProctorRef.current = null;
        setWebcamActive(false);
      }
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [examStarted, attempt?.status, recordViolation, user]);

  if (isLoading || !test || !attempt) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <p className="text-muted-foreground">Loading exam...</p>
      </div>
    );
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 gap-4">
        <p className="text-lg font-medium">Test has been submitted</p>
        {attempt.totalScore !== undefined && (
          <p className="text-2xl font-bold">
            Score: {attempt.totalScore}/{test.totalMarks}
          </p>
        )}
        <Button onClick={() => navigate('/student/tests')}>Back to Tests</Button>
      </div>
    );
  }

  // Pre-exam verification & entry screen
  if (!examStarted) {
    const hasAnyFailed = verificationChecks.some((c) => c.critical && c.status === 'failed');

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50 overflow-y-auto py-8">
        <div className="max-w-lg w-full mx-4 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <ShieldCheck className="h-14 w-14 mx-auto text-primary" />
            <h2 className="text-xl font-heading font-semibold">{test.title}</h2>
            <p className="text-sm text-muted-foreground">
              {test.examType.replace('_', ' ')} · {test.totalTimeMinutes} min · {test.totalMarks} marks
            </p>
          </div>

          {/* Exam Rules */}
          <div className="rounded-lg border bg-card p-4 text-left space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Exam Rules
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>The exam runs in <strong>fullscreen mode</strong> — you cannot exit</li>
              <li>Switching tabs or leaving the window counts as a violation</li>
              <li>Copy, paste, right-click, and screenshots are disabled</li>
              <li>Developer tools must remain closed</li>
              <li><strong>Webcam access is required</strong> — your face must be visible</li>
              <li>After <strong>5 violations</strong> your test is auto-submitted</li>
              <li>The test auto-submits when time runs out</li>
            </ul>
          </div>

          {/* Verification Checklist */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              System Verification
              {!verificationDone && !verificationRunning && (
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  Click "Run Checks" to begin
                </span>
              )}
            </h3>

            <div className="space-y-2">
              {verificationChecks.map((check) => (
                <div
                  key={check.id}
                  className={cn(
                    'flex items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
                    check.status === 'passed' && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20',
                    check.status === 'failed' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
                    check.status === 'warning' && 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20',
                    (check.status === 'pending' || check.status === 'running') && 'border-muted',
                  )}
                >
                  {/* Status icon */}
                  <div className="mt-0.5 shrink-0">
                    {check.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {check.status === 'running' && (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    )}
                    {check.status === 'passed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                    {check.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    {check.status === 'warning' && (
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{check.label}</span>
                      {check.critical && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {check.message || check.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Webcam preview during verification */}
            {verificationChecks.find((c) => c.id === 'webcam')?.status === 'passed' && (
              <div className="flex justify-center pt-2">
                <video
                  ref={verifyVideoRef}
                  muted
                  playsInline
                  width={200}
                  height={150}
                  className="rounded-lg border shadow-sm"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {!verificationDone ? (
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={runVerification}
                disabled={verificationRunning}
              >
                {verificationRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running Checks...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Run System Checks
                  </>
                )}
              </Button>
            ) : hasAnyFailed ? (
              <>
                <div className="text-center text-sm text-red-600 dark:text-red-400 font-medium">
                  Some required checks failed. Fix the issues and retry.
                </div>
                <Button
                  size="lg"
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => {
                    setVerificationDone(false);
                    setVerificationChecks((prev) =>
                      prev.map((c) => ({ ...c, status: 'pending' as const, message: undefined })),
                    );
                    // Stop any preview stream
                    if (verifyStreamRef.current) {
                      verifyStreamRef.current.getTracks().forEach((t) => t.stop());
                      verifyStreamRef.current = null;
                    }
                  }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Re-run Checks
                </Button>
              </>
            ) : (
              <Button size="lg" className="w-full gap-2" onClick={handleStartExam}>
                <Maximize className="h-4 w-4" />
                Enter Fullscreen & Start Exam
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                if (verifyStreamRef.current) {
                  verifyStreamRef.current.getTracks().forEach((t) => t.stop());
                  verifyStreamRef.current = null;
                }
                navigate('/student/tests');
              }}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const section = test.sections[activeSectionIdx];
  const sectionQuestions = (section?.questionIds || []) as unknown as IQuestion[];
  const currentQuestion = sectionQuestions[activeQuestionIdx];
  const currentQId = typeof currentQuestion === 'string' ? currentQuestion : currentQuestion?._id;

  const currentResponse = attempt.responses.find(
    (r) => r.questionId === currentQId && r.sectionIndex === activeSectionIdx,
  );

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const saveCurrentResponse = async (status: QuestionStatus) => {
    if (!attemptId || !currentQId) return;
    setIsSaving(true);
    try {
      const data = await testAttemptService.saveResponse(attemptId, {
        questionId: currentQId,
        sectionIndex: activeSectionIdx,
        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
        numericalAnswer: numericalInput ? parseFloat(numericalInput) : undefined,
        status,
        timeSpent: questionTimerRef.current,
      });
      setAttempt(data);
    } catch {
      // Silently fail for auto-save
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToQuestion = async (sectionIdx: number, questionIdx: number) => {
    // Auto-save current if it was visited
    if (currentResponse?.status === QuestionStatus.NOT_VISITED) {
      const hasAnswer = selectedOptions.length > 0 || numericalInput;
      await saveCurrentResponse(
        hasAnswer ? QuestionStatus.ANSWERED : QuestionStatus.NOT_ANSWERED,
      );
    }

    setActiveSectionIdx(sectionIdx);
    setActiveQuestionIdx(questionIdx);
    questionTimerRef.current = 0;
  };

  const handleOptionToggle = (optionId: string) => {
    const q = currentQuestion as IQuestion;
    if (q.questionType === 'MCQ_SINGLE') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((o) => o !== optionId)
          : [...prev, optionId],
      );
    }
  };

  const handleSaveAndNext = async () => {
    const hasAnswer = selectedOptions.length > 0 || numericalInput;
    await saveCurrentResponse(
      hasAnswer ? QuestionStatus.ANSWERED : QuestionStatus.NOT_ANSWERED,
    );
    // Move to next question
    if (activeQuestionIdx < sectionQuestions.length - 1) {
      setActiveQuestionIdx((p) => p + 1);
    } else if (activeSectionIdx < test.sections.length - 1) {
      setActiveSectionIdx((p) => p + 1);
      setActiveQuestionIdx(0);
    }
    questionTimerRef.current = 0;
  };

  const handleMarkForReview = async () => {
    const hasAnswer = selectedOptions.length > 0 || numericalInput;
    await saveCurrentResponse(
      hasAnswer ? QuestionStatus.ANSWERED_AND_MARKED : QuestionStatus.MARKED_FOR_REVIEW,
    );
    if (activeQuestionIdx < sectionQuestions.length - 1) {
      setActiveQuestionIdx((p) => p + 1);
    }
    questionTimerRef.current = 0;
  };

  const handleClearResponse = () => {
    setSelectedOptions([]);
    setNumericalInput('');
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId) return;
    if (!autoSubmit) {
      const unanswered = attempt.responses.filter(
        (r) =>
          r.status === QuestionStatus.NOT_VISITED ||
          r.status === QuestionStatus.NOT_ANSWERED,
      ).length;
      if (
        !confirm(
          `Submit test? ${unanswered > 0 ? `You have ${unanswered} unanswered question(s). ` : ''}This cannot be undone.`,
        )
      )
        return;
    }

    try {
      // Save current question first
      const hasAnswer = selectedOptions.length > 0 || numericalInput;
      if (currentResponse?.status !== QuestionStatus.NOT_VISITED) {
        await saveCurrentResponse(
          hasAnswer ? QuestionStatus.ANSWERED : QuestionStatus.NOT_ANSWERED,
        );
      }
      const result = await testAttemptService.submitTest(attemptId);
      setAttempt(result);
      toast.success('Test submitted successfully!');
    } catch {
      toast.error('Failed to submit test');
    }
  };

  const isPopulated = typeof currentQuestion !== 'string' && currentQuestion?.questionText;

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-50">
      {/* Webcam preview — small corner feed for proctoring */}
      <video
        ref={webcamVideoRef}
        muted
        playsInline
        width={160}
        height={120}
        className="fixed bottom-4 right-4 z-[60] rounded-lg border-2 border-primary/30 shadow-lg"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* VM warning banner */}
      {verificationChecks.find((c) => c.id === 'vm')?.status === 'warning' && (
        <div className="bg-red-600 text-white text-xs text-center py-1 px-4 shrink-0">
          VM/Remote Desktop detected — this attempt is flagged for review
        </div>
      )}

      {/* Top bar */}
      <div className="h-12 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-heading font-semibold text-sm">{test.title}</span>
          <Badge variant="outline" className="text-xs">
            {test.examType.replace('_', ' ')}
          </Badge>
          {/* Webcam status indicator */}
          <div className={cn(
            'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full',
            webcamActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          )}>
            <Camera className="h-3 w-3" />
            {webcamActive ? 'CAM ON' : 'CAM OFF'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn(
            'font-mono text-sm font-bold px-3 py-1 rounded',
            timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-muted',
          )}>
            {formatTime(timeLeft)}
          </div>
          <Button size="sm" variant="destructive" onClick={() => handleSubmit()}>
            Submit Test
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main question area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section tabs */}
          <div className="flex border-b bg-card/50 shrink-0">
            {test.sections.map((s, i) => (
              <button
                key={i}
                onClick={() => navigateToQuestion(i, 0)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  i === activeSectionIdx
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Question content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isPopulated ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {activeQuestionIdx + 1} of {sectionQuestions.length}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      +{section.markingScheme.correct} / {section.markingScheme.incorrect}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {(currentQuestion as IQuestion).questionType.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <MathRenderer
                  html={(currentQuestion as IQuestion).questionText}
                  className="text-base leading-relaxed"
                />

                {/* Options for MCQ */}
                {((currentQuestion as IQuestion).questionType === 'MCQ_SINGLE' ||
                  (currentQuestion as IQuestion).questionType === 'MCQ_MULTIPLE') && (
                  <div className="space-y-3">
                    {((currentQuestion as IQuestion).options || []).map((opt, optIdx) => {
                      const optId = (opt as any)._id?.toString() || opt.text;
                      const isSelected = selectedOptions.includes(optId);
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleOptionToggle(optId)}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:bg-muted/50',
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                          )}>
                            {isSelected && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="text-sm flex items-baseline gap-1">
                            <strong className="mr-1">{String.fromCharCode(65 + optIdx)}.</strong>
                            <MathRenderer html={opt.text} className="inline" />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Numerical input */}
                {(currentQuestion as IQuestion).questionType === 'NUMERICAL' && (
                  <div className="space-y-2 max-w-xs">
                    <label className="text-sm font-medium">Enter your answer:</label>
                    <input
                      type="number"
                      value={numericalInput}
                      onChange={(e) => setNumericalInput(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                      step="any"
                      placeholder="Type numerical answer..."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Loading question...
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="border-t bg-card p-3 flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResponse}
              >
                Clear Response
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={handleMarkForReview}
              >
                Mark for Review & Next
              </Button>
            </div>
            <div className="flex gap-2">
              {activeQuestionIdx > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToQuestion(activeSectionIdx, activeQuestionIdx - 1)}
                >
                  Previous
                </Button>
              )}
              <Button size="sm" onClick={handleSaveAndNext} disabled={isSaving}>
                Save & Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar — Question palette */}
        <div className="w-64 border-l bg-card flex flex-col shrink-0">
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {section.name} — Question Palette
            </p>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-gray-200" /> Not Visited
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-500" /> Not Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-green-500" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-purple-500" /> Marked
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {sectionQuestions.map((q, qIdx) => {
                const qId = typeof q === 'string' ? q : q._id;
                const response = attempt.responses.find(
                  (r) => r.questionId === qId && r.sectionIndex === activeSectionIdx,
                );
                const status = response?.status || QuestionStatus.NOT_VISITED;
                const isCurrent = qIdx === activeQuestionIdx;

                return (
                  <button
                    key={qIdx}
                    onClick={() => navigateToQuestion(activeSectionIdx, qIdx)}
                    className={cn(
                      'h-9 w-9 rounded text-xs font-medium transition-all',
                      STATUS_COLORS[status],
                      isCurrent && 'ring-2 ring-offset-1 ring-blue-500',
                    )}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section summary */}
          <div className="p-3 border-t text-xs text-muted-foreground space-y-1">
            {(() => {
              const sectionResponses = attempt.responses.filter(
                (r) => r.sectionIndex === activeSectionIdx,
              );
              const answered = sectionResponses.filter(
                (r) =>
                  r.status === QuestionStatus.ANSWERED ||
                  r.status === QuestionStatus.ANSWERED_AND_MARKED,
              ).length;
              const marked = sectionResponses.filter(
                (r) =>
                  r.status === QuestionStatus.MARKED_FOR_REVIEW ||
                  r.status === QuestionStatus.ANSWERED_AND_MARKED,
              ).length;
              const notAnswered = sectionResponses.filter(
                (r) => r.status === QuestionStatus.NOT_ANSWERED,
              ).length;
              return (
                <>
                  <p>Answered: <strong className="text-green-600">{answered}</strong></p>
                  <p>Not Answered: <strong className="text-red-600">{notAnswered}</strong></p>
                  <p>Marked: <strong className="text-purple-600">{marked}</strong></p>
                  <p>Not Visited: <strong>{sectionResponses.length - answered - notAnswered - marked + (sectionResponses.filter(r => r.status === QuestionStatus.ANSWERED_AND_MARKED).length)}</strong></p>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
