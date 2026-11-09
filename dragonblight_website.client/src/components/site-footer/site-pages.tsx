import React from "react";
import { Card } from "@radix-ui/themes";
import { Link } from "react-router";

const discordUrl = "https://discord.gg/3P9em5bKQb";
const patreonUrl = "https://www.patreon.com/cw/dragonblight/membership";
const lastUpdated = "November 8, 2026";

//updated overrides the shared date, for a page that changed on its own
const SitePage: React.FC<{ title: string; showUpdated?: boolean; updated?: string; children: React.ReactNode }> = (props) => {
  let updated = lastUpdated;
  if (props.updated !== undefined) {
    updated = props.updated;
  }
  return (
    <Card className="w-full max-w-[800px] [--card-background-color:#292c31]">
      <div className="p-2 text-sm leading-6 text-gray-200 sm:p-4">
        <h1 className="text-2xl font-bold text-white">{props.title}</h1>
        {props.showUpdated && <p className="mt-1 text-xs text-gray-400">Last updated {updated}</p>}
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
      <p className="mt-4">
        These terms explain what Dragonblight is, what you'll find here, where the information comes from and how far you
        can trust it. By using the site, you agree to them. If you don't agree, please don't use the site.
      </p>

      <Section title="What Dragonblight is">
        <p>
          Dragonblight is a free, fan-made website about player-versus-player (PvP) play in World of Warcraft. It covers
          both the current version of the game (Retail) and Mists of Pandaria Classic, and you can switch between them with
          the Retail / MoP slider at the top of every page. There are no accounts to create, nothing to buy and no
          subscriptions. The site is paid for by advertising, so you'll see ads on its pages.
        </p>
        <p className="mt-2">
          Dragonblight is not made, run, approved or endorsed by Blizzard Entertainment, the company behind World of
          Warcraft.
        </p>
      </Section>

      <Section title="What you'll find on the site">
        <BulletList>
          <li>
            <strong>Character profiles.</strong> Search for any character by name and realm to see their gear, item level,
            talents, stats, current ratings, rating history and a 3D model of the character. A profile can also show other
            characters the site believes belong to the same player, and you can compare two characters side by side.
          </li>
          <li>
            <strong>Rankings.</strong> The rated ladders for the US and Europe: 2v2 and 3v3 arenas, Rated Battlegrounds,
            and on Retail, a separate Solo Shuffle and Blitz ladder for every specialization. MoP Classic also has 5v5. You
            can filter the ladders by class and specialization.
          </li>
          <li>
            <strong>Activity.</strong> Who has been playing recently, how much rating they gained or lost, and how their
            ladder position moved. Players who look like they queued together are grouped as a team.
          </li>
          <li>
            <strong>Cutoffs.</strong> The ratings and ranks needed this season for each PvP title, such as Gladiator. For
            titles that go to a share of the ladder, the site also shows its own estimate of where the cutoff sits right now.
          </li>
          <li>
            <strong>Stats.</strong> How popular each class and specialization is at different ratings, and which team
            compositions are being played the most.
          </li>
          <li>
            <strong>Comp Score</strong> (Retail only). Pick two damage dealers and a healer to get a score out of 100 for how
            well they work together in 3v3, with an explanation of their strengths and weaknesses.
          </li>
          <li>
            <strong>News.</strong> Recent posts from Blizzard's staff on the official World of Warcraft forums.
          </li>
        </BulletList>
      </Section>

      <Section title="Where the information comes from">
        <BulletList>
          <li>
            <strong>Blizzard.</strong> Almost everything about characters and ladders comes from Blizzard's official data
            service, the same public information shown on the World of Warcraft armory. That includes names, realms,
            classes, gear, talents, achievements, ratings, ladder positions and each season's title rewards. Dragonblight
            only sees what Blizzard makes public.
          </li>
          <li>
            <strong>Regular updates.</strong> The site re-reads the ladders from Blizzard on a schedule, starting a new pass
            about every two hours. A full pass across every ladder can take several hours, so some ladders are fresher than
            others at any moment. A character's profile is refreshed when it's looked up or when it shows up on a ladder.
          </li>
          <li>
            <strong>Wowhead.</strong> Item and spell descriptions that pop up when you hover over them, the 3D character
            models and each item's item level in PvP come from Wowhead, a separate World of Warcraft database website.
          </li>
          <li>
            <strong>Blizzard's forums.</strong> The News page shows posts copied from the official World of Warcraft forums.
          </li>
          <li>
            <strong>Twitch.</strong> The live stream on the home page is played straight from Twitch.
          </li>
        </BulletList>
      </Section>

      <Section title="How accurate the information is">
        <p>Some of what you see comes straight from Blizzard, and some is worked out by Dragonblight. They're accurate in different ways.</p>
        <p className="mt-3 font-semibold text-white">Straight from Blizzard</p>
        <p>
          Names, gear, talents, ratings, ladder positions and the official title cutoffs are shown as Blizzard reports them.
          They're as correct as Blizzard's own data, but they can be a few hours behind the game, because the site only
          updates on its schedule and Blizzard's data service can itself run late. A character that hasn't been looked up
          or seen on a ladder in a while may show older information.
        </p>
        <p className="mt-3 font-semibold text-white">Worked out by Dragonblight</p>
        <p className="mb-2">
          Blizzard doesn't publish everything players want to know, so the site makes informed estimates for these. They're
          useful guides, but they can be wrong:
        </p>
        <BulletList>
          <li>
            <strong>Estimated cutoffs.</strong> Blizzard gives some titles to a share of the ladder and counts one spot per
            player, not per character. The site estimates the live cutoff by working out which characters belong to the same
            player and counting each player once. If it links characters wrongly, the estimate shifts.
          </li>
          <li>
            <strong>Characters belonging to the same player.</strong> Blizzard doesn't say which characters share an
            account. The site makes an educated guess by comparing when account-wide achievements were earned on each one.
          </li>
          <li>
            <strong>Teams and compositions.</strong> Blizzard doesn't say who queued with whom. The site guesses that players
            who gained exactly the same wins and losses between two updates played together. Strangers can match by chance,
            and teams that play only a few games aren't counted.
          </li>
          <li>
            <strong>Activity and win rates.</strong> These come from comparing each player's record between updates, so they
            only cover games played since the site last looked, and only for players on the ladders.
          </li>
          <li>
            <strong>PvP item level.</strong> Blizzard only reports an item's normal item level. The higher level an item has
            in PvP is read from Wowhead's description of that item.
          </li>
          <li>
            <strong>Comp Score.</strong> This is an opinion, not a measurement. It comes from hand-set ratings for each
            specialization and rules about how they work together, nudged a little by recent win rates. Use it as a starting
            point for discussion, not a final answer.
          </li>
        </BulletList>
        <p className="mt-2">
          If something looks wrong, please let me know on the <DiscordLink>Dragonblight Discord</DiscordLink>, with a
          link to the page and the character's name.
        </p>
      </Section>

      <Section title="Names, images and trademarks">
        <p>
          World of Warcraft, its names, artwork, icons and game data belong to Blizzard Entertainment. Item and spell
          descriptions and 3D models shown through Wowhead belong to Wowhead and Blizzard. The site's own design, code and
          logo belong to Dragonblight.
        </p>
      </Section>

      <Section title="Other websites">
        <p>
          The site links to and shows content from Twitch, Wowhead, Blizzard and Discord, and its ads come from advertising
          partners. When you use them or click an ad, their own terms and privacy policies apply, and Dragonblight isn't
          responsible for them or for what an ad offers.
        </p>
      </Section>

      <Section title="Changes to the site and these terms">
        <p>
          Features may be added, changed or removed, and the site may sometimes be offline for updates. These terms may also
          change. The date at the top shows the latest version, and continuing to use the site means you accept it.
        </p>
      </Section>
    </SitePage>
  );
}

export function CookiePage() {
  return (
    <SitePage title="Cookie Policy" showUpdated>
      <p className="mt-4">
        This page explains what Dragonblight saves in your web browser when you visit, why, and how you can remove it. It
        also covers what the site's advertising and visitor statistics partners, and other services on the site, may save.
      </p>

      <Section title="What cookies and browser storage are">
        <p>
          When you visit a website, it can ask your browser to keep a small note for it, such as "this visitor prefers the
          3D model switched off". The next time you visit, your browser hands the note back, so the site can remember your
          choice. These notes are called <strong>cookies</strong>. A similar feature called <strong>browser storage</strong>{" "}
          works the same way, except the note stays on your own device and isn't sent back to the website's server.
        </p>
        <p className="mt-2">
          The notes are kept by your browser, on your device. You can see and delete them at any time, as explained below.
        </p>
      </Section>

      <Section title="The short version">
        <BulletList>
          <li>Dragonblight itself saves only three small notes, and all of them are about how pages look or load.</li>
          <li>
            The site shows ads and counts how it's used. The companies that provide the ads and the visit statistics save
            their own cookies, including some that help choose ads based on your interests.
          </li>
          <li>The site has no accounts or logins, so none of these cookies hold your name or email address.</li>
          <li>The live Twitch stream on the home page comes from Twitch, which also saves its own cookies.</li>
        </BulletList>
      </Section>

      <Section title="What Dragonblight saves">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-white">The 3D model switch</p>
            <BulletList>
              <li><strong>Saved as:</strong> a cookie named "showModelViewer".</li>
              <li><strong>What it remembers:</strong> whether you turned on the 3D character model on profile pages. It only holds "true" or "false".</li>
              <li><strong>Why:</strong> so the switch stays where you left it when you open another profile or refresh the page.</li>
              <li><strong>How long it lasts:</strong> until you close your browser.</li>
            </BulletList>
          </div>
          <div>
            <p className="font-semibold text-white">PvP or PvE item level</p>
            <BulletList>
              <li><strong>Saved as:</strong> browser storage named "itemLevelMode".</li>
              <li><strong>What it remembers:</strong> whether you chose to see gear's item level in PvP or outside it (PvE). It only holds "pvp" or "pve".</li>
              <li><strong>Why:</strong> so profiles show the item level you prefer every time.</li>
              <li><strong>How long it lasts:</strong> until you clear it.</li>
            </BulletList>
          </div>
          <div>
            <p className="font-semibold text-white">Saved item level lookups</p>
            <BulletList>
              <li><strong>Saved as:</strong> browser storage named "pvpFloorsByBonus.v1".</li>
              <li>
                <strong>What it remembers:</strong> a list of game item codes and the item level each one reaches in PvP,
                which the site looks up from Wowhead. It's game information only, the same for every visitor, and has
                nothing to do with you or your characters.
              </li>
              <li><strong>Why:</strong> so the site doesn't have to look up the same item again, which makes profiles load faster.</li>
              <li><strong>How long it lasts:</strong> until you clear it.</li>
            </BulletList>
          </div>
        </div>
      </Section>

      <Section title="What Dragonblight doesn't save">
        <BulletList>
          <li>No login or account details, because the site doesn't have accounts.</li>
          <li>No list of the characters you've searched for, kept by Dragonblight itself.</li>
          <li>
            Your choice of Retail or MoP, region and bracket is part of the page's web address, not a saved note. The same
            goes for the specs you pick on Comp Score. That's why sharing a link shows the other person the same page.
          </li>
        </BulletList>
      </Section>

      <Section title="Advertising and visit statistics">
        <p className="mb-2">
          Ads help keep Dragonblight free. The ads, and the statistics about how the site is used, are provided by other
          companies. When a page loads, they can save cookies in your browser and read them on later visits, including on
          other websites that work with them. They use them to:
        </p>
        <BulletList>
          <li>Show ads, and avoid showing you the same one over and over.</li>
          <li>Choose ads that may interest you, based on the sites you've visited and how you've used them.</li>
          <li>Count whether ads were seen or clicked, and stop fake clicks and fraud.</li>
          <li>
            Count visits for Dragonblight: how many people come, which pages they view, for how long, roughly where in the
            world they are, what kind of device they use and how they found the site.
          </li>
        </BulletList>
        <p className="mt-2">
          These companies set and read their own cookies under their own privacy policies, and the exact list can change.
          Where the law requires it, you'll be asked to agree before cookies used for advertising or statistics are saved.
        </p>
      </Section>

      <Section title="What other services may save">
        <p className="mb-2">
          Some parts of Dragonblight are provided by other companies. When your browser loads them, those companies can save
          their own cookies, under their own rules. Dragonblight can't see, read or control them.
        </p>
        <BulletList>
          <li>
            <strong>Advertising partners</strong>, for the ads on the site, as described above.
          </li>
          <li>
            <strong>Visit statistics services</strong>, for counting how the site is used, as described above.
          </li>
          <li>
            <strong>Twitch</strong>, for the live stream on the home page. Twitch and its partners save cookies to run the
            player and for advertising, including ones from Amazon such as "ad-id" and "ad-privacy". They can change what they
            save at any time. See{" "}
            <a className="font-semibold text-[#4dc4fd] hover:underline" href="https://www.twitch.tv/p/legal/cookie-notice/" target="_blank" rel="noopener noreferrer">
              Twitch's cookie notice
            </a>{" "}
            for details.
          </li>
          <li>
            <strong>Wowhead</strong>, for the descriptions that pop up when you hover over an item or spell, and for the 3D
            character models. These load from Wowhead's servers, and Wowhead's own policies apply.
          </li>
          <li>
            <strong>Google Fonts and jQuery</strong>, which supply the site's lettering and some of the code that runs the
            hover descriptions. Your browser downloads these files from them, the same way it downloads parts of most websites.
          </li>
        </BulletList>
      </Section>

      <Section title="How to see or delete what's saved">
        <BulletList>
          <li>
            <strong>For just this site:</strong> in most browsers, click the icon to the left of the web address at the top of
            the window. It opens a menu where you can see this site's cookies and saved data, and remove them.
          </li>
          <li>
            <strong>For every site:</strong> open your browser's settings and look for "Privacy", then "Cookies" or "Site
            data". From there you can clear everything or remove sites one at a time.
          </li>
          <li>
            <strong>Private or incognito windows</strong> start with nothing saved and forget everything when you close them.
          </li>
          <li>
            <strong>Ads based on your interests:</strong> you can turn these off through the advertising settings the site
            offers, through the ad companies' own settings pages, or for many companies at once at{" "}
            <a className="font-semibold text-[#4dc4fd] hover:underline" href="https://youradchoices.com" target="_blank" rel="noopener noreferrer">YourAdChoices</a>{" "}
            (US) or{" "}
            <a className="font-semibold text-[#4dc4fd] hover:underline" href="https://www.youronlinechoices.eu" target="_blank" rel="noopener noreferrer">Your Online Choices</a>{" "}
            (Europe). You'll still see ads, but they won't be chosen based on your browsing.
          </li>
        </BulletList>
      </Section>

      <Section title="What happens if you delete or block them">
        <p className="mb-2">The site keeps working. You'll only notice small things:</p>
        <BulletList>
          <li>The 3D model switch on profiles goes back to off.</li>
          <li>Item levels go back to showing the PvP value.</li>
          <li>Profiles may load a little slower the first time, while item levels are looked up again.</li>
          <li>Ads may be less related to your interests, and you may see some of them more often.</li>
        </BulletList>
        <p className="mt-2">
          Many browsers let you block cookies from other companies (often called "third-party cookies"). Doing so stops most
          of the advertising, statistics and Twitch cookies. Rankings, profiles and everything else on Dragonblight still
          work, though the Twitch stream may ask you to allow cookies before it plays.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If the site starts saving something new, this page will be updated. The date at the top shows the latest version.
          See the <PageLink to="/privacy">Privacy Policy</PageLink> for how information is handled more broadly.
        </p>
      </Section>
    </SitePage>
  );
}

export function PrivacyPage() {
  return (
    <SitePage title="Privacy Policy" showUpdated>
      <p className="mt-4">
        This page explains what information Dragonblight handles, where it comes from, what it's used for, how long it's
        kept and what you can do about it.
      </p>

      <Section title="The short version">
        <BulletList>
          <li>There are no accounts. The site never asks for your name, email address, password or payment details.</li>
          <li>
            Most of what the site stores is public World of Warcraft character information that Blizzard already shows on
            its own armory.
          </li>
          <li>
            The site is paid for by ads, and it counts how it's used. Information about your visit is shared with the
            companies that provide the ads and the statistics, as explained below.
          </li>
          <li>Some parts of the site come from other companies, like the Twitch stream, and they have their own rules.</li>
        </BulletList>
      </Section>

      <Section title="Information about World of Warcraft characters">
        <p className="mb-2">
          Blizzard publishes information about characters through its official data service, the same information anyone
          can see on the World of Warcraft armory. Dragonblight reads it and keeps a copy so pages load quickly. This
          includes:
        </p>
        <BulletList>
          <li>The character's name, realm, region, race, class and specialization.</li>
          <li>Their gear, talents, stats and achievements.</li>
          <li>Their PvP ratings, wins and losses, and position on the ladders.</li>
        </BulletList>
        <p className="mt-2">
          This is information about game characters, not about you as a person. Dragonblight never sees your Battle.net
          account, your email address or anything else Blizzard keeps privately. If you've hidden a character from the
          armory in Blizzard's settings, Blizzard doesn't share it, so Dragonblight can't show it.
        </p>
      </Section>

      <Section title="Information the site works out">
        <p className="mb-2">Using that public information, the site also builds a few things of its own:</p>
        <BulletList>
          <li>
            <strong>Rating history:</strong> each time the site reads the ladders, it notes a character's rating, so their
            profile can show a graph of how it changed over the season.
          </li>
          <li>
            <strong>Recent activity:</strong> who played recently and how their rating moved, found by comparing the ladders
            from one reading to the next.
          </li>
          <li>
            <strong>Teams:</strong> players whose wins and losses changed in exactly the same way are guessed to have played
            together. Only the team's mix of classes is shown on the Stats page, not who was on it.
          </li>
          <li>
            <strong>Characters belonging to the same player:</strong> some achievements are shared by every character on a
            Battle.net account, and they all show the same date and time for when it was earned. The site compares those
            dates to guess which characters belong together. It stores the result as a scrambled code made from those dates,
            not as anything that names the account or the person. These guesses can be wrong.
          </li>
        </BulletList>
      </Section>

      <Section title="When you visit the site">
        <BulletList>
          <li>
            <strong>Searches:</strong> when you type a character's name, it's sent to the site's server to find matching
            characters. Searches aren't saved as a history of what you looked up.
          </li>
          <li>
            <strong>Your connection:</strong> like every website, the server and the company hosting it receive your internet
            address (IP address) and basic details about your browser when pages load. This is needed to send the page back to
            you. The server also writes a running log of what it's doing, which can include the pages requested. It's used to
            keep the site working and fix problems, not to build a picture of visitors.
          </li>
          <li>
            <strong>Visit statistics:</strong> the site counts how it's used, such as how many people visit, which pages they
            view and for how long, roughly where in the world they are and what kind of device they use. This is done through
            a statistics service, which uses cookies to tell visits apart.
          </li>
          <li>
            <strong>Your settings:</strong> a few display choices are saved in your own browser, as explained in the{" "}
            <PageLink to="/cookies">Cookie Policy</PageLink>.
          </li>
        </BulletList>
      </Section>

      <Section title="Advertising">
        <p className="mb-2">
          The ads on Dragonblight come from advertising partners. To show and measure them, information about your visit is
          shared with those partners, mostly collected directly by them through their code and cookies on the page. It can
          include:
        </p>
        <BulletList>
          <li>Your IP address, and your approximate location worked out from it.</li>
          <li>Your browser, device type and settings such as language.</li>
          <li>The pages you view on Dragonblight, and when.</li>
          <li>Codes saved in cookies that let them recognize your browser on later visits and on other websites.</li>
          <li>Which ads you saw or clicked.</li>
        </BulletList>
        <p className="mt-2">
          They use it to show ads, choose ads that may interest you, measure how ads perform and prevent fraud. They may
          combine it with what they know from other websites, under their own privacy policies. Dragonblight doesn't have
          your name or contact details, so it doesn't share them.
        </p>
      </Section>

      <Section title="Other companies your browser connects to">
        <p className="mb-2">
          Some parts of the site come straight from other companies. When a page loads them, your browser connects to those
          companies directly, so they also receive your IP address and browser details, under their own privacy policies:
        </p>
        <BulletList>
          <li><strong>Advertising partners</strong>, for the ads on the site.</li>
          <li><strong>A visit statistics service</strong>, for counting how the site is used.</li>
          <li><strong>Twitch</strong> and its advertising and video partners, for the live stream on the home page.</li>
          <li><strong>Wowhead</strong>, for the descriptions that pop up over items and spells, and the 3D character models.</li>
          <li><strong>Blizzard</strong>, for character pictures.</li>
          <li><strong>Google Fonts</strong> and <strong>jQuery</strong>, for the site's lettering and some of its code.</li>
        </BulletList>
      </Section>

      <Section title="How information is used">
        <BulletList>
          <li>To run Dragonblight and its features, and fix problems.</li>
          <li>To understand how the site is used, so it can be improved.</li>
          <li>To show ads that pay for the site, through advertising partners, as described above.</li>
        </BulletList>
        <p className="mt-2">
          Character information from Blizzard is used to run the site's features. It isn't what's used to choose your ads.
        </p>
      </Section>

      <Section title="How long information is kept">
        <BulletList>
          <li>Character profiles are refreshed from Blizzard regularly, and old copies are replaced within hours to a day.</li>
          <li>Ladders are read again every few hours, replacing the previous copy.</li>
          <li>Recent activity covers roughly the last half day.</li>
          <li>Team guesses for the Stats page are kept for a week.</li>
          <li>The history behind estimated cutoffs is kept for 30 days.</li>
          <li>
            Rating history and the guesses about which characters belong to the same player are kept longer, because they're
            part of what profiles show.
          </li>
          <li>Advertising partners and the statistics service keep what they collect for as long as their own policies say.</li>
        </BulletList>
      </Section>

      <Section title="Your choices and rights">
        <p>
          Depending on where you live, including the EU and the UK, you may have the right to see the information held about
          you, have it corrected or deleted, or object to how it's used. To ask about a character or make a request, reach
          out on the <DiscordLink>Dragonblight Discord</DiscordLink>.
        </p>
        <p className="mt-2">
          You can also turn off ads based on your interests, and limit advertising and statistics cookies, as explained in
          the <PageLink to="/cookies">Cookie Policy</PageLink>. Depending on where you live, such as some US states, you may
          also have the right to opt out of your information being shared for advertising.
        </p>
        <p className="mt-2">
          Keep in mind that Blizzard is the original source. Information removed from Dragonblight still exists at Blizzard,
          and while a character stays public there, it can appear again the next time the site reads the ladders. To stop a
          character being shared at all, hide it from the armory through Blizzard.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>If the site starts handling information in a new way, this page will be updated. The date at the top shows the latest version.</p>
      </Section>
    </SitePage>
  );
}

export function SupportPage() {
  return (
    <SitePage title="Support Me">
      <p className="mt-4">
        Dragonblight is free to use. Ads and supporters help pay for the servers that keep the rankings, profiles and stats
        up to date. If you find the site useful, here's how you can help.
      </p>
      <Section title="Become a supporter on Patreon">
        <p>
          A monthly pledge on Patreon is the most direct way to keep Dragonblight running and growing. Every bit helps, and
          it means a lot.
        </p>
        <a
          className="mt-3 inline-block rounded-sm bg-[#4fc6ff]/70 px-6 py-2 font-bold text-white hover:bg-[#4fc6ff]"
          href={patreonUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Support Dragonblight on Patreon
        </a>
      </Section>
      <Section title="Other ways to help">
        <BulletList>
          <li>Share the site with your team, guild or friends.</li>
          <li>Report bugs and wrong data so they can be fixed.</li>
          <li>Suggest features you'd like to see.</li>
        </BulletList>
        <p className="mt-2">All of that happens on Discord: <DiscordLink>join the Dragonblight Discord</DiscordLink>.</p>
      </Section>
      <p className="mt-4">Thank you for using the site!</p>
    </SitePage>
  );
}
