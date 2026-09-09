import type { ReactNode } from "react";
import Link from "next/link";
import { BuildInfo } from "@/components/build-info";
import { APP_NAME, MAINTAINER_NAME, MAINTAINER_URL, SOURCE_URL } from "@/lib/config";
import { GitHubMark } from "@/components/github-mark";

export const metadata = { title: `Privacy and trust · ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-10">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to the app
      </Link>
      <h1 className="font-heading text-3xl font-semibold">Privacy and trust</h1>
      <p className="text-lg text-muted-foreground">
        This page is not a policy. It is a list of things you can check for yourself.
      </p>

      <Section title="Where your ideas are">
        <p>
          In one file that you chose: on your own computer, or in your own Google Drive. {APP_NAME} has no accounts
          and no database. The site you loaded is a folder of static files; there is no server-side code at all.
        </p>
        <p>
          On your computer, you can see the file in Finder or Explorer. You can copy it, back it up, put it in a
          folder your iCloud, Dropbox, OneDrive or Google Drive client syncs, or open it in a text editor. It is plain
          JSON. In Google Drive it is the same file, in the folder you picked, and you can download it from there.
        </p>
      </Section>

      <Section title="Check the network yourself">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Open your browser’s developer tools (F12, or Cmd-Option-I on a Mac) and choose the Network tab.</li>
          <li>Use the app: score an idea, add a conversation, park something.</li>
          <li>
            Watch the list. After the page has loaded, nothing else is requested. The one exception is a small file
            called build.json, fetched from this same site when you open Settings or this page, so the app can show
            its fingerprint. There are no calls to any server, because there is nothing to call.
          </li>
        </ol>
        <p>
          If you keep your matrix in Google Drive, you will also see requests to googleapis.com: one to read or write
          your file, and one every half minute to ask whether it changed elsewhere. Those go to Google, on your
          account, with the file’s contents. Nothing goes anywhere else.
        </p>
      </Section>

      <Section title="If you choose Google Drive">
        <p>
          Two of Google’s own scripts load, from accounts.google.com and apis.google.com, and only after you choose
          Drive: one for signing in, one for the file picker. Google signs you in on its own page and hands the app a
          key that lets it read and write files in your Drive for about an hour. That key stays in this browser tab’s
          memory. It is not stored, and there is no server of the app’s to send it to; when it expires, one click gets
          a new one.
        </p>
        <p>
          The permission the app asks for is the narrowest Google offers: only files the app created, or that you
          picked in the file picker. It cannot list your Drive, and it cannot read anything else in it. You can take
          the permission away at any time in your Google Account under Security, Third-party apps.
        </p>
        <p>
          Google can see the file, because it is plain JSON in their storage, the same as any document you keep there.
          If that is a concern, keep the file on this computer instead.
        </p>
      </Section>

      <Section title="What the browser remembers">
        <p>
          A cached copy of your matrix and a pointer to your file live in this browser’s private storage, so the app
          opens instantly and works offline. They never leave the browser. Clearing site data removes
          them; your file is untouched.
        </p>
        <p>
          On a return visit the browser asks for one click before the app may write to your file again. That prompt is
          the browser’s, not the app’s, and it is a good thing.
        </p>
      </Section>

      <Section title="No telemetry">
        <p>
          No analytics, no crash reporting, no usage pings, and no third-party scripts beyond Google’s two, which load
          only if you choose Drive. There is nothing in the code that could send your ideas, or anything about how you
          use the app, anywhere.
        </p>
      </Section>

      <Section title="AI assistants">
        <p>
          {APP_NAME} comes with a small program you can install so Claude Desktop, Claude Code or a local model can
          read and update your matrix through the Model Context Protocol. It runs on your computer, on the same file as
          the app. When you use it, the text of the idea you ask about goes to whichever assistant you connected, on
          your account, and nowhere else. There is no server of the app’s in between.
        </p>
      </Section>

      <Section title="Read the source">
        <p>
          {APP_NAME} is open source under the MIT licence.
          {SOURCE_URL ? (
            <>
              {" "}
              The code is at{" "}
              <a
                href={SOURCE_URL}
                className="inline-flex items-center gap-1 underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                <GitHubMark className="size-4" /> {SOURCE_URL.replace("https://", "")}
              </a>
              .
            </>
          ) : null}{" "}
          It is maintained by {MAINTAINER_NAME} (
          <a href={MAINTAINER_URL} className="underline underline-offset-4" target="_blank" rel="noreferrer">
            {MAINTAINER_URL.replace("https://", "")}
          </a>
          ). Every pull request runs the same checks, and the rule that nothing leaves your machine is written into the
          contributor guidelines.
        </p>
      </Section>

      <Section title="The build you are running">
        <BuildInfo />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-xl font-bold">{title}</h2>
      <div className="flex flex-col gap-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}
