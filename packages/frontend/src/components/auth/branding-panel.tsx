import { BookOpen, Users, ClipboardList } from 'lucide-react';

export function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[60%] flex-col justify-center items-center bg-gradient-to-br from-navy-900 via-navy to-blue-600 p-12 text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold">CBT Platform</h1>
          <p className="text-blue-200 mt-2 text-lg">Computer-Based Testing for JEE & NEET</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <ClipboardList className="w-6 h-6 mx-auto mb-2 text-blue-200" />
            <p className="text-2xl font-heading font-bold">500+</p>
            <p className="text-xs text-blue-200 mt-1">Practice Tests</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-200" />
            <p className="text-2xl font-heading font-bold">200+</p>
            <p className="text-xs text-blue-200 mt-1">Students</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-200" />
            <p className="text-2xl font-heading font-bold">10K+</p>
            <p className="text-xs text-blue-200 mt-1">Questions</p>
          </div>
        </div>

        <p className="text-blue-200/80 text-sm mt-12">
          NTA-pattern exam interface with AI proctoring
        </p>
      </div>
    </div>
  );
}
