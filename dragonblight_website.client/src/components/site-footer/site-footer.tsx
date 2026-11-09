import { Link } from "react-router";

const footerLinks = [
  { to: "/terms", label: "Terms of Use" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/support", label: "Support Me" },
];

//Footer links open at the top of the new page, since the router keeps the scroll position otherwise
function SiteFooter() {
  return (
    <footer className="relative z-10 mt-10 border-t border-black bg-[#1c1f24] px-4 py-6">
      {/* w-fit sizes the wrapper to the disclaimer line, so the links end where that line ends */}
      <div className="mx-auto w-fit max-w-[960px]">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-3">
            <img className="h-14 w-14" src="/Nav/dragonblight-logo.webp" alt="" />
            <span className="text-lg font-bold text-white">Dragonblight</span>
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => window.scrollTo(0, 0)}
                className="text-gray-300 hover:text-white hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-5 text-center text-xs text-gray-400 sm:text-left">
          <p>© 2024-{new Date().getFullYear()} Dragonblight. All rights reserved.</p>
          <p className="mt-1">
            World of Warcraft and Blizzard Entertainment are trademarks of Blizzard Entertainment, Inc. Dragonblight is
            not affiliated with or endorsed by Blizzard.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
