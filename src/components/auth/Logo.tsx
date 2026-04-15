import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
}

const logoURL = "/favicon.ico"
const Logo = ({ className }: LogoProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="bg-brand-600 text-white font-bold text-xl w-10 h-10 rounded-lg flex items-center justify-center">
        <Image src={logoURL}
          alt=""
          height={48}
          width={48} />
      </div>
      <span className="ml-2 text-xl font-bold text-gray-900">London Chauffeur Hire</span>
    </div>
  );
};

export default Logo;
