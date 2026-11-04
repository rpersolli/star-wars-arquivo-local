# Holoarquivo · Star Wars Saga Edition

Site local para sua mesa, inspirado na organização do projeto Daggerheart. Não utiliza serviços externos, fontes remotas, contas ou hospedagem. Os PDFs e as dependências já estão incluídos.

## Abrir no computador

1. Mantenha todos os arquivos desta pasta juntos.
2. Dê dois cliques em **Iniciar.cmd**. Requer Node.js, já disponível no computador onde este projeto foi criado.
3. Abra **http://127.0.0.1:8790** se o navegador não abrir automaticamente.
4. Mantenha a janela do servidor aberta. Para encerrar, pressione Ctrl+C nessa janela.

Não abra index.html diretamente: o leitor precisa do servidor local. Se a porta estiver ocupada, encerre a outra instância ou defina PORT antes de executar `node server.cjs`.

## Celular, tablet e amigos na mesma rede

1. Execute **Iniciar-na-rede.cmd** no PC.
2. Conecte os dispositivos à mesma rede Wi-Fi do PC.
3. Digite no Safari, Chrome ou outro navegador o endereço **Na mesma rede Wi-Fi** mostrado na janela. O endereço 127.0.0.1 só funciona no próprio PC.
4. Caso o Windows solicite acesso, permita apenas na sua rede privada. O PC precisa permanecer ligado.

Esse modo disponibiliza os livros para os dispositivos que alcançarem o PC na rede. Não possui login; use uma rede de confiança. Não configure encaminhamento de portas no roteador. O inicializador normal aceita somente conexões do próprio computador. Não há publicação na internet.

## O que está incluído

- Biblioteca com o livro fornecido (288 páginas), capa, favoritos e importação de outros PDFs.
- Busca global no texto dos livros, contagem de ocorrências, destaque e navegação nas páginas encontradas. O texto extraído da tradução pode apresentar falhas. Imagens digitalizadas sem texto não são pesquisáveis; não há OCR automático.
- Leitor com zoom, ferramenta de mão, duas páginas, atalhos ←/→ e A/D, além de navegação por capítulos do livro incluído. O seletor usa a numeração impressa; a caixa Página usa a posição no PDF.
- Área exclusiva de fichas: modelo fornecido de duas páginas, 314 campos de formulário, importação de PDF preenchido, edição, salvamento de cópia no navegador e download do PDF.
- Galeria de páginas ilustradas extraídas do livro.
- Caderno do mestre com criação, edição, exclusão e exportação das notas em JSON.
- Tema claro/escuro, tamanho do texto, alto contraste e redução de movimentos.

## Preencher e guardar uma ficha

1. Entre em **Minhas fichas** e escolha **Editar ficha** no modelo, ou importe seu PDF preenchido.
2. Toque nos campos destacados e preencha. Use a seta para a segunda página.
3. Clique em **Salvar neste aparelho** para guardar uma cópia no navegador. O nome do personagem identifica a cópia quando preenchido nesta sessão.
4. Clique em **Baixar PDF editado** para guardar um arquivo independente. Importe esse PDF para continuar em outro dispositivo.

A edição preserva os campos do PDF fornecido. Outros PDFs só terão campos editáveis se possuírem formulários compatíveis. A opção Editar texto visível faz uma substituição visual com fundo branco; não remove o texto original e não é uma ferramenta de redação segura. PDFs protegidos, assinados ou sem campos podem não ser compatíveis. Não há cálculo automático das regras da ficha.

## Onde ficam meus dados?

Fichas e PDFs importados ficam no IndexedDB do navegador. Notas, favoritos e configurações ficam no armazenamento local do navegador. Não são enviados ao servidor nem sincronizados entre amigos, aparelhos, endereços ou navegadores. Todos recebem os dois materiais incluídos; cada pessoa mantém suas próprias fichas e notas.

**Exporte PDFs e notas com frequência.** Limpar dados do navegador, usar modo privado ou trocar o endereço do site pode fazer seus registros locais desaparecerem ou ficarem inacessíveis. Guarde a pasta inteira para manter uma cópia dos materiais incluídos. O backup JSON das notas é um arquivo legível; esta versão não tem importador de notas.

## Compatibilidade e manutenção

Interface responsiva preparada para PC, tablet e celular. A validação automatizada usa navegador Chromium; não substitui um teste físico em Safari/iOS ou Android. O navegador precisa oferecer módulos JavaScript, Canvas, Web Workers, IndexedDB e Web Crypto.

Servidor: Node.js sem pacotes adicionais. Leitor: PDF.js. Edição: pdf-lib. As bibliotecas estão em site/vendor com suas informações de licença nos arquivos distribuídos. Não é necessário instalar pacotes npm para rodar.

Os materiais de Star Wars pertencem aos respectivos titulares e foram incluídos a partir dos arquivos fornecidos para esta biblioteca pessoal. O site não é um produto oficial.
