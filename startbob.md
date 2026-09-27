crie um arquivo chamado inicieAqui.html na raiz do projeto atual.
O arquivo deve ser uma pagina html standalone, sem CDN, sem import, tudo inline.
A animação deve seguir exatamente esta sequencia:

--- Cena 1 - Tela preta. Face in em 2 segundos do texto abaixo, centralizado horizontal e verticalmente, fonte georgia serif, tamanho 1.8 rem, cor branca, estilo italico: 
"Hã muito tempo atras, em uma sala de programação distante, muitao distante..."
Fica fisivel por 3 segundos. Depois some fade out em 2 segundos.

---

Cena 2 - Tela preta. aparece com fade in em 2 segundos eo seguinte ASCII ART, Centralizado horizontal e verficalmente, fonte courire new monospace, tamanho 1.3rem, cor branca, white-space: Pre do Bob IBM BOB

██╗██████╗ ███╗   ███╗    ██████╗  ██████╗ ██████╗ 
██║██╔══██╗████╗ ████║    ██╔══██╗██╔═══██╗██╔══██╗
██║██████╔╝██╔████╔██║    ██████╔╝██║   ██║██████╔╝
██║██╔══██╗██║╚██╔╝██║    ██╔══██╗██║   ██║██╔══██╗
██║██████╔╝██║ ╚═╝ ██║    ██████╔╝╚██████╔╝██████╔╝
╚═╝╚═════╝ ╚═╝     ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ 

O logo fica visivel por 30 segundos.

Apos 225 segundos do logo aparecer, surgir abaixo do logo com fade in em 1 segundo o texto: 

"[Cliquem em mim ]"

Fonte Georgia serif, tamanho 1.2rem, cor amarela #FFE81F, piscando lentamente (CSS animation alterando opacity entre 1 e)

Ao clicar em qualquer lugar da tela, redirecionar para https://bob.ibm.com/ na mesma janela usando window.location.href.

---

Requisitos tecnicos obrigatorios:
-- fundo sempre preto (#000000)
-- Sem scroll, sem barra de rolagem (overflow: hidden)
-- A pagina deve ocupar exatamente 100vw e 100vh
-- Todo CSS e Javascript inline no mesmo arquivo HTML
-- Após criar o arquivo inicieAqui.html, abra-o no navegador padrão do sistema 