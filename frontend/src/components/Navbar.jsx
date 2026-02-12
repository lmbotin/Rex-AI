import { Link } from 'react-router-dom';
import { motion } from "framer-motion";
import logoIcon from '../assets/rex_logo.png';

const MotionImg = motion.img;

const Navbar = () => {
  return (
    <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
      <div className="w-full max-w-6xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] px-8 py-3 flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/5">
        <div className="w-1/4 flex justify-start">
          <Link to="/" className="inline-flex items-center gap-3 group whitespace-nowrap">
            <MotionImg 
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              src={logoIcon} 
              alt="Rex AI" 
              className="h-16 w-auto drop-shadow-xl" 
            />
            <span className="text-white text-2xl font-extrabold tracking-tight">Rex AI</span>
          </Link>
        </div>
        
        {/* Nav Links - Center */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-8 text-sm font-bold text-white/80">
          <span className="hover:text-white transition-colors cursor-pointer">Products</span>
          <span className="hover:text-white transition-colors cursor-pointer">Solutions</span>
          <span className="hover:text-white transition-colors cursor-pointer">Pricing</span>
          <span className="hover:text-white transition-colors cursor-pointer">Resources</span>
        </div>
        
        <div className="w-1/4 flex justify-end">
          <Link 
            to="/login" 
            className="px-8 py-3 rounded-full font-bold text-forest bg-white hover:bg-melon transition-all text-base shadow-lg hover:shadow-white/20 hover:scale-105"
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
