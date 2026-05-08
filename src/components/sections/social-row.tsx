import { motion } from "framer-motion";
import { Instagram, Youtube, Music, Facebook, Linkedin, Twitter } from "lucide-react";

interface SocialLink {
  name: string;
  icon: React.ReactNode;
  url: string;
  dataId: string;
}

const SocialRow = () => {
  const socialLinks: SocialLink[] = [
    {
      name: "Instagram",
      icon: <Instagram className="w-6 h-6" />,
      url: "{{URL_INSTAGRAM}}",
      dataId: "instagram",
    },
    {
      name: "YouTube",
      icon: <Youtube className="w-6 h-6" />,
      url: "{{URL_YOUTUBE}}",
      dataId: "youtube",
    },
    {
      name: "TikTok",
      icon: <Music className="w-6 h-6" />,
      url: "{{URL_TIKTOK}}",
      dataId: "tiktok",
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-6 h-6" />,
      url: "{{URL_FACEBOOK}}",
      dataId: "facebook",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="w-6 h-6" />,
      url: "{{URL_LINKEDIN}}",
      dataId: "linkedin",
    },
    {
      name: "Twitter",
      icon: <Twitter className="w-6 h-6" />,
      url: "{{URL_TWITTER}}",
      dataId: "twitter",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="flex items-center justify-center gap-3 flex-wrap"
    >
      {socialLinks.map((social, index) => (
        <motion.a
          key={social.dataId}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/60 transition-all duration-300 hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none shadow-sm hover:shadow-md"
          aria-label={`Seguir no ${social.name}`}
          data-evt="social_click"
          data-id={social.dataId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          {social.icon}
        </motion.a>
      ))}
    </motion.div>
  );
};

export default SocialRow;
