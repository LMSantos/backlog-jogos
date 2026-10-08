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
          Última atualização: 8 de outubro de 2026 (app pessoal)
        </p>
      </header>

      <Section title="O que é este app">
        O Backlog de Jogos é um app pessoal e sem fins lucrativos para
        organizar os jogos que você quer jogar e decidir o que jogar com o
        tempo livre que tem.
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

      <Section title="Conta Steam (opcional)">
        <p>
          Vincular a Steam é opcional: o app funciona sem ela. Se você vincular,
          o login acontece na própria Steam e o app <strong>nunca vê sua
          senha</strong>, nem consegue alterar nada na sua conta Steam (não
          compra, não vende, não muda configurações).
        </p>
        <p className="mt-2">O app lê, pela API oficial da Steam:</p>
        <ul className="list-disc pl-5">
          <li>seu SteamID, nome e foto do perfil;</li>
          <li>sua lista de jogos e o tempo jogado em cada um;</li>
          <li>suas conquistas nos jogos do seu backlog.</li>
        </ul>
        <p className="mt-2">
          E guarda: o SteamID, os jogos que <strong>você escolher</strong>{" "}
          importar (com as horas jogadas) e quantas conquistas você tem em cada
          um. A lista completa da sua biblioteca não é guardada.
        </p>
        <p className="mt-2">
          Para isso a Steam exige que seu perfil e os detalhes dos jogos
          estejam públicos, o que os deixa visíveis para qualquer pessoa na
          própria Steam (no app, continuam visíveis só para você). Você pode desvincular a qualquer momento em
          Minha conta: isso apaga do app o SteamID, as horas jogadas e as
          conquistas guardadas (os jogos continuam no seu backlog).
        </p>
      </Section>

      <Section title="Quem pode ver seus dados">
        <strong>Só você.</strong> O app não tem parte social: outras pessoas
        com conta no app não veem seu perfil, seu backlog nem suas conquistas.
        Essa regra é aplicada pelo próprio banco de dados, não só pelas telas.
      </Section>

      <Section title="Onde os dados ficam">
        Os dados são guardados no Supabase (banco de dados e login) e o site é
        hospedado na Vercel. Os dados da Steam vêm da API oficial da Valve. As informações dos jogos (nomes, capas, gêneros e
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
