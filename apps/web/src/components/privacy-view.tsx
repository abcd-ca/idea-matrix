"use client";

import { BuildInfo } from "@/components/build-info";
import { GitHubMark } from "@/components/github-mark";
import { APP_NAME, MAINTAINER_NAME, MAINTAINER_URL, SOURCE_URL } from "@/lib/config";
import Link from "next/link";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

export function PrivacyView() {
  const { t } = useTranslation("privacy");
  const app = { app: APP_NAME };
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-10">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        {t("back")}
      </Link>
      <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("intro")}</p>

      <Section title={t("where.title")}>
        <p>{t("where.p1", app)}</p>
        <p>{t("where.p2")}</p>
      </Section>

      <Section title={t("network.title")}>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("network.step1")}</li>
          <li>{t("network.step2")}</li>
          <li>{t("network.step3")}</li>
        </ol>
        <p>{t("network.drive")}</p>
      </Section>

      <Section title={t("drive.title")}>
        <p>{t("drive.p1")}</p>
        <p>{t("drive.p2")}</p>
        <p>{t("drive.p3")}</p>
      </Section>

      <Section title={t("browser.title")}>
        <p>{t("browser.p1")}</p>
        <p>{t("browser.p2")}</p>
        <p>{t("browser.p3")}</p>
      </Section>

      <Section title={t("telemetry.title")}>
        <p>{t("telemetry.p1")}</p>
      </Section>

      <Section title={t("ai.title")}>
        <p>{t("ai.p1", app)}</p>
      </Section>

      <Section title={t("source.title")}>
        <p>
          {t("source.licence", app)}
          {SOURCE_URL ? (
            <>
              {" "}
              <Trans
                t={t}
                i18nKey="source.code"
                values={{ repo: SOURCE_URL.replace("https://", "") }}
                components={{
                  a: (
                    <a
                      href={SOURCE_URL}
                      className="inline-flex items-center gap-1 underline underline-offset-4"
                      target="_blank"
                      rel="noreferrer"
                    />
                  ),
                  icon: <GitHubMark className="size-4" />,
                }}
              />
            </>
          ) : null}{" "}
          <Trans
            t={t}
            i18nKey="source.maintained"
            values={{ maintainer: MAINTAINER_NAME, site: MAINTAINER_URL.replace("https://", "") }}
            components={{
              a: <a href={MAINTAINER_URL} className="underline underline-offset-4" target="_blank" rel="noreferrer" />,
            }}
          />
        </p>
      </Section>

      <Section title={t("build.title")}>
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
