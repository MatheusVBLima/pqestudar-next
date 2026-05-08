import { Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
import { motion } from "framer-motion";

const socialLinks = [
  {
    name: "Instagram",
    icon: Instagram,
    href: "https://www.instagram.com/mdias.ofc/",
    label: "412k+ Seguidores",
  },
  {
    name: "Threads",
    icon: () => (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.186 3.15c-.43 0-.855.029-1.273.087a8.865 8.865 0 0 0-2.253.63 7.822 7.822 0 0 0-2.044 1.295A7.817 7.817 0 0 0 5.321 7.206a8.865 8.865 0 0 0-.63 2.253 11.415 11.415 0 0 0-.087 1.273v2.536c0 .43.029.855.087 1.273.122.766.35 1.51.63 2.253a7.817 7.817 0 0 0 1.295 2.044 7.822 7.822 0 0 0 2.044 1.295 8.865 8.865 0 0 0 2.253.63c.418.058.843.087 1.273.087h2.536c.43 0 .855-.029 1.273-.087a8.865 8.865 0 0 0 2.253-.63 7.822 7.822 0 0 0 2.044-1.295 7.817 7.817 0 0 0 1.295-2.044 8.865 8.865 0 0 0 .63-2.253c.058-.418.087-.843.087-1.273v-2.536c0-.43-.029-.855-.087-1.273a8.865 8.865 0 0 0-.63-2.253 7.817 7.817 0 0 0-1.295-2.044 7.822 7.822 0 0 0-2.044-1.295 8.865 8.865 0 0 0-2.253-.63 11.415 11.415 0 0 0-1.273-.087h-2.536zm-.373 1.993h3.124c.317 0 .627.022.931.066.565.082 1.12.235 1.652.456.479.199.934.455 1.356.764.422.309.798.673 1.12 1.084.322.411.587.861.792 1.344.221.532.374 1.087.456 1.652.044.304.066.614.066.931v3.124c0 .317-.022.627-.066.931a6.873 6.873 0 0 1-.456 1.652 5.824 5.824 0 0 1-.792 1.344 5.822 5.822 0 0 1-1.12 1.084 5.824 5.824 0 0 1-1.356.764 6.873 6.873 0 0 1-1.652.456c-.304.044-.614.066-.931.066h-3.124c-.317 0-.627-.022-.931-.066a6.873 6.873 0 0 1-1.652-.456 5.824 5.824 0 0 1-1.344-.792 5.824 5.824 0 0 1-1.084-1.12 5.822 5.822 0 0 1-.764-1.356 6.873 6.873 0 0 1-.456-1.652 7.08 7.08 0 0 1-.066-.931v-3.124c0-.317.022-.627.066-.931.082-.565.235-1.12.456-1.652.199-.479.455-.934.764-1.356.309-.422.673-.798 1.084-1.12.411-.322.861-.587 1.344-.792.532-.221 1.087-.374 1.652-.456.304-.044.614-.066.931-.066z" />
      </svg>
    ),
    href: "https://www.threads.net/@mdias.ofc",
    label: "Threads",
  },
  {
    name: "TikTok",
    icon: () => (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
    href: "https://www.tiktok.com/@mdias.ofc",
    label: "2.8k+ Seguidores",
  },
  {
    name: "YouTube",
    icon: Youtube,
    href: "https://www.youtube.com/@mdias-ofc",
    label: "YouTube",
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    href: "https://www.linkedin.com/in/mdiasofc/",
    label: "LinkedIn",
  },
  {
    name: "Facebook",
    icon: Facebook,
    href: "https://www.facebook.com/profile.php?id=61577754095302",
    label: "2.3k+ Seguidores",
  },
];

export function AboutSocialLinks() {
  return (
    <section className="w-full py-16 md:py-20 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">
              Conecte-se Comigo
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Acompanhe as novidades, hacks e conteúdos diários nas redes sociais.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {socialLinks.map((social, index) => {
              const Icon = social.icon;
              return (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-md hover:shadow-lg ring-2 ring-transparent hover:ring-primary/30"
                >
                  <Icon className="h-6 w-6" />
                </motion.a>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
