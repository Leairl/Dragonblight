import React from "react";
import { Card } from "@radix-ui/themes";
import { Link } from "react-router";

const discordUrl = "https://discord.gg/3P9em5bKQb";
const lastUpdated = "November 4, 2026";

const SitePage: React.FC<{ title: string; showUpdated?: boolean; children: React.ReactNode }> = (props) => {
  return (
    <Card className="w-full max-w-[800px] [--card-background-color:#292c31]">
      <div className="p-2 text-sm leading-6 text-gray-200 sm:p-4">
        <h1 className="text-2xl font-bold text-white">{props.title}</h1>
        {props.showUpdated && <p className="mt-1 text-xs text-gray-400">Last updated {lastUpdated}</p>}
        {props.children}
      </div>
    </Card>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = (props) => {
  return (
    <section className="mt-5">
      <h2 className="mb-1 text-base font-bold text-white">{props.title}</h2>
      {props.children}
    </section>
  );
};

const BulletList: React.FC<{ children: React.ReactNode }> = (props) => {
  return <ul className="ml-5 list-disc space-y-1">{props.children}</ul>;
};

const DiscordLink: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <a className="font-semibold text-[#4dc4fd] hover:underline" href={discordUrl} target="_blank" rel="noopener noreferrer">
      {props.children}
    </a>
  );
};

const PageLink: React.FC<{ to: string; children: React.ReactNode }> = (props) => {
  return (
    <Link className="font-semibold text-[#4dc4fd] hover:underline" to={props.to} onClick={() => window.scrollTo(0, 0)}>
      {props.children}
    </Link>
  );
};

export function TermsPage() {
  return (
    <SitePage title="Terms of Use" showUpdated>
      <p className="mt-4">By using Dragonblight, you agree to these terms. If you don't agree, please don't use the site.</p>
      <Section title="What the site is">
        <p>
          Dragonblight is a free, fan-made site for World of Warcraft PvP data on Retail and Mists of Pandaria Classic.
          It isn't affiliated with or endorsed by Blizzard Entertainment.
        </p>
      </Section>
      <Section title="Accuracy">
        <p>
          Most data comes from Blizzard and can be delayed or incomplete. Some features, such as estimated cutoffs,
          team compositions and linked characters, are worked out by the site and may be wrong.
        </p>
      </Section>
      <Section title="Acceptable use">
        <BulletList>
          <li>Don't try to disrupt, overload or break into the site or its server.</li>
          <li>Don't scrape the site at a volume that affects other visitors.</li>
          <li>Don't use the site to harass other players.</li>
        </BulletList>
      </Section>
      <Section title="Content and trademarks">
        <p>
          The site's own design, code and logo belong to Dragonblight. World of Warcraft names, images and game data
          belong to Blizzard Entertainment. Other content belongs to its respective owners.
        </p>
      </Section>
      <Section title="Other sites">
        <p>
          The site links to and embeds services such as Twitch, Wowhead and Discord. Their own terms apply when you use
          them, and Dragonblight isn't responsible for them.
        </p>
      </Section>
      <Section title="No warranty">
        <p>
          The site is provided "as is", without warranties of any kind. It may change or go offline at any time. To the
          extent the law allows, Dragonblight isn't liable for losses from using the site or relying on its data.
        </p>
      </Section>
      <Section title="Changes">
        <p>These terms may change. The date at the top shows the latest version, and continuing to use the site means you accept it.</p>
      </Section>
    </SitePage>
  );
}

export function CookiePage() {
  return (
    <SitePage title="Cookie Policy" showUpdated>
      <p className="mt-4">
        Cookies and browser storage are small pieces of data saved in your browser. Dragonblight sets very few of its
        own, but the embedded Twitch player sets more.
      </p>
      <Section title="Set by Dragonblight">
        <p className="mb-2">These only remember your display settings, and are not used to track you.</p>
        <BulletList>
          <li><strong>showModelViewer</strong> (cookie): whether the profile's character model viewer is switched on.</li>
          <li><strong>itemLevelMode</strong> (browser storage): whether profiles show PvP or PvE item levels.</li>
          <li><strong>pvpFloorsByBonus.v1</strong> (browser storage): saved item level lookups, so tooltips load faster.</li>
        </BulletList>
      </Section>
      <Section title="Set by other services">
        <p className="mb-2">
          The home page embeds a live Twitch stream. Loading it lets Twitch and its partners set their own cookies,
          including advertising cookies from Amazon such as <strong>ad-id</strong> and <strong>ad-privacy</strong>.
          Dragonblight doesn't control or read them, and the list can change.
        </p>
        <p>
          Wowhead's tooltip and model viewer scripts also load from Wowhead's servers. See{" "}
          <a className="font-semibold text-[#4dc4fd] hover:underline" href="https://www.twitch.tv/p/legal/cookie-notice/" target="_blank" rel="noopener noreferrer">
            Twitch's cookie notice
          </a>{" "}
          for details on how Twitch uses cookies.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You can block or delete cookies and browser storage in your browser's settings. Blocking third-party cookies
          stops most of those listed above, and the site's rankings and profiles keep working, though saved settings may reset.
        </p>
      </Section>
      <Section title="More information">
        <p>See the <PageLink to="/privacy">Privacy Policy</PageLink> for how data is handled more broadly.</p>
      </Section>
    </SitePage>
  );
}

export function PrivacyPage() {
  return (
    <SitePage title="Privacy Policy" showUpdated>
      <p className="mt-4">Dragonblight has no user accounts and doesn't ask for your name, email address or payment details.</p>
      <Section title="World of Warcraft character data">
        <p className="mb-2">The site gets public character data from Blizzard's API and stores a copy so pages load quickly. This includes:</p>
        <BulletList>
          <li>Character names, realms, classes, specs, gear, talents and achievements.</li>
          <li>Ratings, ladder positions and rating history.</li>
          <li>
            Linked characters: the site can show characters it believes share a Battle.net account, by comparing when
            account-wide achievements were earned. These links are estimates.
          </li>
        </BulletList>
      </Section>
      <Section title="When you use the site">
        <BulletList>
          <li>Character searches are sent to the server to find results.</li>
          <li>Like most websites, the server and its hosting may process your IP address and browser details to deliver pages and keep the site running.</li>
          <li>Your display settings stay in your browser, as described in the <PageLink to="/cookies">Cookie Policy</PageLink>.</li>
        </BulletList>
      </Section>
      <Section title="Other services">
        <p className="mb-2">Your browser connects directly to these services when pages load, so they can see your IP address and browser details:</p>
        <BulletList>
          <li><strong>Twitch</strong> and its advertising and video partners, for the embedded stream.</li>
          <li><strong>Wowhead</strong>, for item tooltips and the model viewer.</li>
          <li><strong>Blizzard</strong>, for character images.</li>
          <li><strong>Google Fonts</strong> and <strong>jQuery's CDN</strong>, for fonts and scripts.</li>
        </BulletList>
      </Section>
      <Section title="How data is used">
        <p>Data is used only to run the site and its features. Dragonblight doesn't sell it and doesn't run its own ads or analytics.</p>
      </Section>
      <Section title="How long data is kept">
        <p>
          Cached character data is refreshed or expires over time. Rating history and character links can be kept longer,
          since they're part of what the site shows.
        </p>
      </Section>
      <Section title="Your rights">
        <p>
          Depending on where you live, including the EU and UK, you may have rights to access, correct or delete your
          data, or object to how it's used. To ask about a character or make a request, reach out through the{" "}
          <PageLink to="/contact">Contact page</PageLink>. Data removed here may still exist at Blizzard, and hiding your
          character from the armory is managed in-game or through Blizzard.
        </p>
      </Section>
      <Section title="Children">
        <p>The site isn't directed at children under 13.</p>
      </Section>
      <Section title="Changes">
        <p>This policy may change. The date at the top shows the latest version.</p>
      </Section>
    </SitePage>
  );
}

export function ContactPage() {
  return (
    <SitePage title="Contact Me">
      <p className="mt-4">The best way to reach me is on Discord. It's the place for:</p>
      <div className="mt-2">
        <BulletList>
          <li>Bug reports and wrong data. Please include the page link and character name.</li>
          <li>Feature ideas and feedback.</li>
          <li>Privacy requests about a character. See the <PageLink to="/privacy">Privacy Policy</PageLink>.</li>
        </BulletList>
      </div>
      <p className="mt-4"><DiscordLink>Join the Dragonblight Discord</DiscordLink></p>
    </SitePage>
  );
}

export function SupportPage() {
  return (
    <SitePage title="Support Me">
      <p className="mt-4">Dragonblight is free to use. If you find it useful, here's how you can help:</p>
      <div className="mt-2">
        <BulletList>
          <li>Share the site with your team, guild or friends.</li>
          <li>Report bugs and wrong data so they can be fixed.</li>
          <li>Suggest features you'd like to see.</li>
        </BulletList>
      </div>
      <p className="mt-4">All of that happens on Discord: <DiscordLink>join the Dragonblight Discord</DiscordLink>.</p>
      <p className="mt-2">Thank you for using the site!</p>
    </SitePage>
  );
}
