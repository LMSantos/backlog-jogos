import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Política de Privacidade | Backlog de Jogos",
};

const CONTACT_EMAIL = "lucas.matos.santos@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 text-base leading-relaxed">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          ← Backlog de Jogos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Política de Privacidade
        </h1>
        <p className="text-sm text-zinc-500">
          Última atualização: 8 de outubro de 2026
        </p>
      </header>

      <Section title="O que é este app">
        O Backlog de Jogos é um app pessoal e sem fins lucrativos para um grupo
        de amigos organizar os jogos que querem jogar e decidir o que jogar com
        o tempo livre que têm.
      </Section>

      <Section title="Quais dados coletamos">
        <ul className="list-disc pl-5">
          <li>
            <strong>E-mail</strong>, usado para entrar no app (por link no
            e-mail ou pelo Google).
          </li>
          <li>
            <strong>Nome e foto de perfil</strong>, quando você entra com o
            Google. Não pedimos acesso a mais nada da sua conta Google.
          </li>
          <li>
            <strong>Nome de usuário</strong> que você escolhe no primeiro
            acesso.
          </li>
          <li>
            <strong>Seu backlog</strong>: os jogos que você adiciona, com
            status, prioridade, nota e datas de início e conclusão.
          </li>
        </ul>
      </Section>

      <Section title="Quem pode ver seus dados">
        Seu nome, foto, nome de usuário e backlog ficam visíveis para as outras
        pessoas que têm conta no app, para que os amigos vejam o que cada um
        está jogando. Seu e-mail não aparece para outros usuários. Só você
        pode alterar o seu backlog.
      </Section>

      <Section title="Onde os dados ficam">
        Os dados são guardados no Supabase (banco de dados e login) e o site é
        hospedado na Vercel. As informações dos jogos (nomes, capas, gêneros e
        tempo médio) vêm da RAWG; nenhum dado seu é enviado para a RAWG.
      </Section>

      <Section title="Cookies">
        Usamos apenas os cookies necessários para manter você conectado. Não
        usamos cookies de publicidade nem de rastreamento, e não vendemos nem
        compartilhamos seus dados com ninguém.
      </Section>

      <Section title="Como apagar seus dados">
        Para apagar sua conta e todos os seus dados, envie um e-mail para{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-2"
        >
          {CONTACT_EMAIL}
        </a>
        . Você também pode remover jogos do seu backlog a qualquer momento
        dentro do app.
      </Section>

      <Section title="Contato">
        Dúvidas sobre esta política:{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-2"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}
