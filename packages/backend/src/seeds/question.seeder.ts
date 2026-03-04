import { Model, Types } from 'mongoose';
import { QuestionType, DifficultyLevel, SUBJECTS, SUBJECT_TOPICS } from '@exam-portal/shared';

// Question templates per subject-topic with LaTeX math syntax ($..$ inline, $$...$$ display)
const QUESTION_TEMPLATES: Record<string, Record<string, string[]>> = {
  Physics: {
    Mechanics: [
      'A block of mass $m = 5$ kg is placed on a frictionless inclined plane at angle $\\theta = 30°$. Find the acceleration $a = g\\sin\\theta$.',
      'Two objects of masses $m_1 = 3$ kg and $m_2 = 7$ kg are connected by a string over a pulley. Find the tension $T = \\frac{2m_1 m_2 g}{m_1 + m_2}$.',
      'A projectile is launched at $v_0 = 20$ m/s at angle $\\theta = 45°$. Calculate the maximum height $H = \\frac{v_0^2 \\sin^2\\theta}{2g}$.',
      'A body moves in a circular path of radius $r = 2$ m with speed $v = 4$ m/s. Find the centripetal acceleration $a_c = \\frac{v^2}{r}$.',
    ],
    Thermodynamics: [
      'An ideal gas at temperature $T = 300$ K undergoes isothermal expansion from $V_1$ to $V_2 = 2V_1$. Calculate the work done $W = nRT\\ln\\frac{V_2}{V_1}$.',
      'Find the efficiency of a Carnot engine operating between $T_1 = 500$ K and $T_2 = 300$ K: $\\eta = 1 - \\frac{T_2}{T_1}$.',
      'A gas expands adiabatically. Given $T_1 V_1^{\\gamma-1} = T_2 V_2^{\\gamma-1}$, find the final temperature.',
    ],
    Optics: [
      'A convex lens of focal length $f = 20$ cm forms an image. Using $\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f}$, find the object distance.',
      'Light passes from medium of refractive index $n_1 = 1.5$ to $n_2 = 1.0$. Find the critical angle $\\theta_c = \\sin^{-1}\\frac{n_2}{n_1}$.',
      'In Young\'s double slit experiment with slit separation $d = 0.5$ mm and wavelength $\\lambda = 600$ nm, find the fringe width $\\beta = \\frac{\\lambda D}{d}$.',
    ],
    Electrostatics: [
      'Two charges $q_1 = 3\\mu C$ and $q_2 = -5\\mu C$ are placed $r = 0.2$ m apart. Find the force $F = \\frac{1}{4\\pi\\epsilon_0}\\frac{q_1 q_2}{r^2}$.',
      'A parallel plate capacitor has plate area $A = 0.01$ m² and separation $d = 2$ mm. Find the capacitance $C = \\frac{\\epsilon_0 A}{d}$.',
      'Find the electric field at distance $r = 0.5$ m from a charge $q = 4\\mu C$: $E = \\frac{1}{4\\pi\\epsilon_0}\\frac{q}{r^2}$.',
    ],
    'Modern Physics': [
      'Find the de Broglie wavelength $\\lambda = \\frac{h}{\\sqrt{2meV}}$ of an electron accelerated through $V = 100$ volts.',
      'The half-life of a radioactive element is $t_{1/2} = 5$ years. Find the decay constant $\\lambda = \\frac{0.693}{t_{1/2}}$.',
      'A photon of wavelength $\\lambda = 200$ nm strikes a metal (work function $\\phi = 4.2$ eV). Find $KE_{max} = \\frac{hc}{\\lambda} - \\phi$.',
    ],
  },
  Chemistry: {
    'Physical Chemistry': [
      'Calculate the pH of a $0.01$ M solution of HCl. Use $pH = -\\log[H^+]$.',
      'Find the cell potential $E^\\circ_{cell} = E^\\circ_{cathode} - E^\\circ_{anode}$ for the given reaction.',
      'The rate constant of a first-order reaction is $k = 0.02$ s$^{-1}$. Find the half-life $t_{1/2} = \\frac{0.693}{k}$.',
    ],
    'Organic Chemistry': [
      'Identify the major product when $CH_3CH_2Br$ undergoes $S_N2$ reaction with $NaOH$.',
      'What is the IUPAC name of the compound with molecular formula $C_4H_{10}O$?',
      'Which reagent is used to convert $R-OH$ to $R-CHO$ without further oxidation to $R-COOH$?',
    ],
    'Inorganic Chemistry': [
      'What is the hybridization of the central atom in $SF_6$?',
      'Identify the geometry of $[Ni(CN)_4]^{2-}$ using VSEPR theory.',
      'Which of the following has the highest lattice energy: $NaCl$, $KCl$, $MgO$, $CaO$?',
    ],
    'Chemical Bonding': [
      'How many $\\sigma$ and $\\pi$ bonds are present in $CH_2=CH-CH=CH_2$?',
      'Arrange $H_2O$, $NH_3$, $CH_4$ in order of increasing bond angle.',
      'Which molecule has the highest dipole moment: $CO_2$, $H_2O$, $NH_3$, $CCl_4$?',
    ],
  },
  Mathematics: {
    Algebra: [
      'Find the roots of the equation $2x^2 + 5x - 3 = 0$ using the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.',
      'If $\\alpha$ and $\\beta$ are roots of $x^2 - 5x + 6 = 0$, find $\\alpha^2 + \\beta^2$.',
      'Solve the system: $2x + 3y = 7$ and $x - y = 1$.',
    ],
    Calculus: [
      'Find $\\frac{dy}{dx}$ if $y = x^3 \\sin(2x)$.',
      'Evaluate the integral $\\int_0^{\\pi/2} \\sin^2 x \\, dx$.',
      'Find the maximum value of $f(x) = -x^2 + 4x + 5$ in $[0, 5]$.',
      'Find the area bounded by $y = x^2$ and $y = 2x$ using $\\int_0^2 (2x - x^2)\\,dx$.',
    ],
    'Coordinate Geometry': [
      'Find the equation of the tangent to the parabola $y^2 = 12x$ at the point $(3, 6)$.',
      'Find the eccentricity of the ellipse $\\frac{x^2}{25} + \\frac{y^2}{16} = 1$. Use $e = \\sqrt{1 - \\frac{b^2}{a^2}}$.',
      'Find the distance between the foci of the hyperbola $\\frac{x^2}{9} - \\frac{y^2}{16} = 1$.',
    ],
    Trigonometry: [
      'Find the general solution of $\\sin(2x) = \\frac{\\sqrt{3}}{2}$.',
      'Prove that $\\sin^2\\theta + \\cos^2\\theta = 1$ using the unit circle.',
      'If $\\tan A = \\frac{1}{2}$ and $\\tan B = \\frac{1}{3}$, find $\\tan(A + B) = \\frac{\\tan A + \\tan B}{1 - \\tan A \\tan B}$.',
    ],
    Probability: [
      'A bag contains $5$ red and $3$ blue balls. Find the probability of drawing $2$ red balls: $P = \\frac{\\binom{5}{2}}{\\binom{8}{2}}$.',
      'Find the mean $\\mu = np$ and variance $\\sigma^2 = npq$ of a binomial distribution with $n = 10$ and $p = 0.3$.',
    ],
  },
  Botany: {
    'Cell Biology': [
      'Which organelle is known as the powerhouse of the cell? It produces ATP via the equation: $C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + ATP$.',
      'Describe the structure and function of the cell membrane (fluid mosaic model).',
      'What is the role of ribosomes in protein synthesis (translation)?',
    ],
    Genetics: [
      'In a monohybrid cross ($Tt \\times Tt$), what is the phenotypic ratio in $F_2$ generation?',
      'What is the difference between codominance and incomplete dominance?',
      'A gene has $n$ alleles. The number of possible genotypes in a diploid organism is $\\frac{n(n+1)}{2}$.',
    ],
    Ecology: [
      'What is the difference between a food chain and a food web?',
      'Define ecological succession and its types (primary and secondary).',
      'What is the role of decomposers in an ecosystem?',
    ],
  },
  Zoology: {
    'Human Physiology': [
      'Describe the mechanism of breathing. Tidal volume $\\approx 500$ mL, vital capacity $\\approx 3.5$ L.',
      'What is the role of nephrons in urine formation? GFR $\\approx 125$ mL/min.',
      'Explain the cardiac cycle. Cardiac output $= $ stroke volume $\\times$ heart rate.',
    ],
    'Animal Kingdom': [
      'What are the distinguishing features of phylum Chordata?',
      'Classify organisms based on body symmetry: radial vs bilateral.',
      'What is the difference between Protostomes and Deuterostomes?',
    ],
    Evolution: [
      'Explain Darwin\'s theory of natural selection.',
      'What is Hardy-Weinberg equilibrium? $p^2 + 2pq + q^2 = 1$ where $p + q = 1$.',
      'Differentiate between homologous and analogous organs.',
    ],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateOptions(questionType: QuestionType, questionIndex: number) {
  const optionLabels = ['A', 'B', 'C', 'D'];

  if (questionType === QuestionType.MCQ_SINGLE) {
    const correctIdx = questionIndex % 4;
    return optionLabels.map((label, i) => ({
      text: `Option ${label}`,
      isCorrect: i === correctIdx,
    }));
  }

  if (questionType === QuestionType.MCQ_MULTIPLE) {
    // 2 correct answers
    const correct1 = questionIndex % 4;
    const correct2 = (questionIndex + 2) % 4;
    return optionLabels.map((label, i) => ({
      text: `Option ${label}`,
      isCorrect: i === correct1 || i === correct2,
    }));
  }

  if (questionType === QuestionType.ASSERTION_REASON) {
    return [
      { text: 'Both Assertion and Reason are true and Reason is the correct explanation', isCorrect: questionIndex % 4 === 0 },
      { text: 'Both Assertion and Reason are true but Reason is not the correct explanation', isCorrect: questionIndex % 4 === 1 },
      { text: 'Assertion is true but Reason is false', isCorrect: questionIndex % 4 === 2 },
      { text: 'Assertion is false but Reason is true', isCorrect: questionIndex % 4 === 3 },
    ];
  }

  // NUMERICAL - no options
  return [];
}

function generateCorrectAnswer(questionType: QuestionType, options: { text: string; isCorrect: boolean }[], questionIndex: number) {
  if (questionType === QuestionType.NUMERICAL) {
    const value = (questionIndex * 7 + 3) % 100 + 1;
    return { value, tolerance: 0.01 };
  }

  return options
    .filter((o) => o.isCorrect)
    .map((o) => o.text);
}

export async function seedQuestions(questionModel: Model<any>, teacherId: Types.ObjectId) {
  console.log('Seeding 100 questions...');

  const difficulties = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD];
  const questionTypes = [QuestionType.MCQ_SINGLE, QuestionType.MCQ_SINGLE, QuestionType.MCQ_MULTIPLE, QuestionType.NUMERICAL];

  const questions = [];

  for (let i = 0; i < 100; i++) {
    const subject = SUBJECTS[i % SUBJECTS.length];
    const topics = SUBJECT_TOPICS[subject];
    const topic = topics[i % topics.length];
    const difficulty = difficulties[i % 3];
    const questionType = questionTypes[i % 4];

    // Get a question template
    const subjectTemplates = QUESTION_TEMPLATES[subject];
    const topicTemplates = subjectTemplates?.[topic];
    let questionText: string;
    if (topicTemplates && topicTemplates.length > 0) {
      questionText = topicTemplates[i % topicTemplates.length];
    } else {
      questionText = `${subject} - ${topic}: Sample question #${i + 1} for testing purposes.`;
    }
    // Add question number to ensure uniqueness
    questionText = `Q${i + 1}. ${questionText}`;

    const options = generateOptions(questionType, i);
    const correctAnswer = generateCorrectAnswer(questionType, options, i);

    const marks = questionType === QuestionType.NUMERICAL ? 4 : 4;
    const negativeMarks = questionType === QuestionType.NUMERICAL ? 0 : 1;

    questions.push({
      questionText,
      questionType,
      options,
      correctAnswer,
      subject,
      topic,
      difficultyLevel: difficulty,
      marks,
      negativeMarks,
      explanation: `Explanation for question ${i + 1}: This is a ${difficulty.toLowerCase()} level ${subject} question on ${topic}.`,
      tags: [subject.toLowerCase(), topic.toLowerCase(), difficulty.toLowerCase()],
      createdBy: teacherId,
      isActive: true,
    });
  }

  await questionModel.insertMany(questions);
  console.log('  Seeded 100 questions across 5 subjects.');

  // Print distribution
  const subjectCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  for (const q of questions) {
    subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
    difficultyCounts[q.difficultyLevel] = (difficultyCounts[q.difficultyLevel] || 0) + 1;
    typeCounts[q.questionType] = (typeCounts[q.questionType] || 0) + 1;
  }
  console.log('  By subject:', subjectCounts);
  console.log('  By difficulty:', difficultyCounts);
  console.log('  By type:', typeCounts);
}
