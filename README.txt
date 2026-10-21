NEON SNAKE ONLINE — MULTIPLAYER

O que contém:
- public/index.html: jogo no navegador
- server.js: servidor que mantém o estado compartilhado da partida
- package.json: dependências

IMPORTANTE:
O multiplayer online precisa estar hospedado num serviço que execute Node.js. Abrir index.html diretamente como arquivo não conecta amigos. Depois de hospedar, todos usam o mesmo endereço do site. O anfitrião clica em Criar sala, compartilha o link/código, os amigos entram e o anfitrião clica em Iniciar partida.

Regras:
- Até 3 jogadores por sala
- Cada 10 comidas coletadas no total, aparece uma estrela no centro (15,15) do mapa
- Quem pega recebe 5 segundos de poder e pisca; durante esse período fica imune a colisões com outras cobras e rouba 1 ponto por segundo de cada adversário ativo, transferindo-o para si
- Comida vale 1 ponto
- Controles por toque; teclado também é aceito

Hospedagem:
1. Publique esta pasta num serviço que suporte Node.js (por exemplo, Render, Railway ou outro host Node).
2. O comando de inicialização é: npm start
3. A raiz publicada deve servir o conteúdo da pasta public e executar server.js.
4. Compartilhe a URL pública com os amigos.
