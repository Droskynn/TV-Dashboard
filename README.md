# Dashboard RSS (TV-Dashboard)

Painel de notícias em tela cheia, pensado para rodar 24/7 em TVs e telas de sinalização. Mostra manchetes de vários feeds RSS brasileiros em um mosaico de cartões com carrossel, além de relógio, clima local e cotações de moedas — tudo em uma única página.

É um PWA de **arquivo único** com suporte offline: todo o HTML, CSS e JS ficam em `TV.html`. Não há build, bundler nem dependências para instalar.

## Recursos

- **Mosaico de feeds** — 8 widgets, cada um em carrossel automático (troca a cada 6 s) com barra de progresso e indicadores.
- **Relógio** com data, no topo central.
- **Clima local** via [Open-Meteo](https://open-meteo.com/), usando geolocalização do navegador e geocodificação reversa do [Nominatim/OpenStreetMap](https://nominatim.openstreetmap.org/).
- **Cotações** (USD, EUR, GBP, JPY, CNY, ARS, BTC) em ticker rolante via [AwesomeAPI](https://docs.awesomeapi.com.br/).
- **PWA / offline** — `manifest.json` + Service Worker (`sw.js`) com pré-cache do shell e cache de imagens (limite de 100 itens, FIFO).
- **Feito para TV** — layout responsivo até 4K, proteção contra *burn-in* (deslocamento sutil de pixels), cursor que some após inatividade e modo `fullscreen`.
- **Acessibilidade** — link "pular para conteúdo", foco visível, suporte a alto contraste e a `prefers-reduced-motion`.