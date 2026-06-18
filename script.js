const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const wait = ms => new Promise(res => setTimeout(res, ms));
let cardSize = [96,128];
let startBot = Boolean(_.random(0, 1));
let playerCardIndex = 0;
let botCardIndex = 0;
let botWaiting = false;
let ended = false;
let scrlIndex = 50;
let drawCoinAfter = 50;
let keys = {};
const Places = Object.freeze({
    DECK: [canvas.width / 2 - cardSize[0] / 2 - cardSize[0] * 4, canvas.height / 2 - cardSize[1] / 2],
    TABLE: [canvas.width / 2 - cardSize[0] / 2, canvas.height / 2 - cardSize[1] / 2],
    HAND_START: [cardSize[1]*1.5625 - (cardSize[0] * 1.25), canvas.height - cardSize[1]*1.5625],
    BOT_START: [cardSize[1]*1.5625 - (cardSize[0] * 1.25), cardSize[1]*1.5625-cardSize[1]]
});

const CardLocation = Object.freeze({
    DECK: "DECK",
    TABLE: "TABLE",
    PLAYER: "PLAYER",
    BOT: "BOT"
});
class Coin {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;

        this.isSpinning = false;
        this.scaleX = 1;          // Aktualne skalowanie w poziomie (od 1 do -1)
        this.spinSpeed = 0.15;     // Prędkość obrotu
        this.side = 1;      // Aktualna strona ("orzel" lub "reszka")
        this.targetSide = 0; // Strona, na której moneta ma wylądować
        this.rotationsLeft = 0;   // Ile pełnych obrotów ma wykonać
        this.frames = 3;
    }

    // Funkcja uruchamiająca rzut
    flip() {
        if (this.isSpinning) return; // Blokujemy ponowne kliknięcie w trakcie lotu
        // Losujemy stronę docelową (odpowiednik random.choice z Lodash)
        this.targetSide = Number(startBot); 
        this.isSpinning = true;
        this.rotationsLeft = 6; // Moneta obróci się 6 razy (czyli zrobi 3 pełne pętle)
    }

    // Funkcja aktualizująca animację (wywoływana w update())
    updateAnimation() {
        if (!this.isSpinning) return;
        this.frames++;
        this.size = 160 - Math.sin(this.frames / 10) * 30;
        this.x = canvas.width / 2 - this.size/2
        this.y = 80-(this.size-160)/2

        // Zmniejszamy szerokość monety (symulacja obrotu)
        this.scaleX -= this.spinSpeed;

        // Gdy moneta staje się idealnie "cienka" (szerokość przechodzi przez 0)
        if (this.scaleX <= 0 && this.scaleX + this.spinSpeed > 0) {
            // Zmieniamy stronę wizualną na przeciwną w połowie obrotu
            this.side = (this.side === 1) ? 0 : 1;
        }

        // Gdy moneta zrobiła pół obrotu (skala doszła do -1)
        if (this.scaleX <= -1) {
            this.scaleX = 1; // Resetujemy skalę do początku
            this.rotationsLeft--;

            // Jeśli to był ostatni obrót, zatrzymujemy monetę na właściwej stronie
            if (this.rotationsLeft <= 0) {
                this.side = this.targetSide;
                this.scaleX = 1;
                this.isSpinning = false;
                console.log(`Wypadło: ${this.side}!`);
            }
        }
    }

    // Rysowanie monety na środku swojej pozycji
    draw(ctx) {
        // Monety ładujemy tak samo jak karty (musisz mieć orzel.png i reszka.png)
        const img = cardImages[this.side]; 
        if (!img) return;

        ctx.save(); // Zapisujemy stan płótna

        // Przesuwamy punkt rysowania na środek monety (kluczowe do obrotu!)
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);

        // Skalujemy płótno w poziomie! To tworzy efekt 3D flippowania
        ctx.scale(this.scaleX, 1);

        // Rysujemy monetę wycentrowaną (odjmujemy połowę rozmiaru)
        ctx.drawImage(img, -this.size / 2, -this.size / 2, this.size, this.size);

        ctx.restore(); // Przywracamy stan płótna do normy
    }
}
const gameCoin = new Coin(canvas.width / 2, 80, 160);
class Card {
    constructor(sign, color) {
        this.sign = sign;
        this.color = color;
        this.reversed = true;
        this.location = CardLocation.DECK;
        this.x = Places.DECK[0];
        this.y = Places.DECK[1];
    }

    toString() {
        if (this.reversed) { 
            return `Back`;
        } else {
            return `${this.color}${this.sign}`;
        }
    }


    goTo(newLocation) {
        this.location = newLocation;
    }

    // Ta funkcja wykonuje się co klatkę i płynnie przesuwa kartę do celu
    updateAnimation() {
        // Prosty algorytm płynnego zbliżania się do celu (Lerp)
        // Karta w każdej klatce pokonuje 15% dystansu jaki pozostał do celu
        this.x += (this.targetX - this.x) * 0.15;
        this.y += (this.targetY - this.y) * 0.15;
    }

    draw(nx, ny) {
        const img = cardImages[this.toString()];
        if (img) {
            ctx.drawImage(img, this.x + nx, this.y + ny, cardSize[0], cardSize[1]);
        }
    }
}

let types = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
let cards = [];
types.forEach(type => {
   cards.push(
       new Card(type, "♠"),
       new Card(type, "♥"),
       new Card(type, "♦"),
       new Card(type, "♣")
   );
});
cards = _.shuffle(cards);

const mouse = { x: 0, y: 0 };

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;
    mouse.x = relativeX * (canvas.width / rect.width);
    mouse.y = relativeY * (canvas.height / rect.height);
});

canvas.addEventListener("click", () => {
    const x = mouse.x;
    const y = mouse.y;
    if (botWaiting) return

    let clickedCard = null;

    cards.forEach(card => {
        if (x > card.x && x < card.x + cardSize[0] &&
            y > card.y && y < card.y + cardSize[1]) {
            clickedCard = card;
        }
    });

    if (!clickedCard) return
    
    if (clickedCard.location === CardLocation.DECK) {
    
        topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
        if (topDeckCard) {
            topDeckCard.goTo(CardLocation.PLAYER);
            topDeckCard.reversed = false;
            startBot = true;
        }
    }else if (clickedCard.location === CardLocation.PLAYER) {
    
        let topTableCard = cards.filter(c => c.location === CardLocation.TABLE).at(-1);
        
    
        if (canPlace(clickedCard)) {
            clickedCard.goTo(CardLocation.TABLE);
            cards.splice(cards.indexOf(clickedCard),1)
            cards.push(clickedCard)
            switch(clickedCard.sign){
                case "2":
                    _.range(2).forEach(i =>{
                        topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                        if (topDeckCard){
                            topDeckCard.goTo(CardLocation.BOT);
                            topDeckCard.reversed = true;
                        }
                    })
                break
                case "3":
                    _.range(3).forEach(i =>{
                        topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                        if (topDeckCard){
                            topDeckCard.goTo(CardLocation.BOT);
                            topDeckCard.reversed = true;
                        }
                    })
                break
                case "4":
                    startBot = false;
                break
                case "K":
                    if (clickedCard.color === "♥" || clickedCard.color === "♠"){
                        _.range(5).forEach(i =>{
                            topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                            if (topDeckCard){
                                topDeckCard.goTo(CardLocation.BOT);
                                topDeckCard.reversed = true;
                            }
                        })}else{startBot = true;}
                break
                default:
                    startBot = true;
                break
            }
        } else {
            console.log("Ta karta nie pasuje!");
        }
    }
    
});
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);
async function update() {
    if (gameCoin.isSpinning){
        gameCoin.updateAnimation()
        cards.forEach(card => {
        if (card.location === CardLocation.DECK) {
            card.targetX = Places.DECK[0];
            card.targetY = Places.DECK[1];
        } else if (card.location === CardLocation.TABLE) {
            card.targetX = Places.TABLE[0];
            card.targetY = Places.TABLE[1];
        } else if (card.location === CardLocation.PLAYER) {
            card.targetX = Places.HAND_START[0] + playerCardIndex * (cardSize[0] * 1.25) - scrlIndex;
            card.targetY = Places.HAND_START[1];
            playerCardIndex++;
        } else if (card.location === CardLocation.BOT) {
            card.targetX = Places.BOT_START[0] + botCardIndex * (cardSize[0] * 1.25);
            card.targetY = Places.BOT_START[1];
            botCardIndex++;
        }
        card.updateAnimation();
    });
        return
    }
    playerCardIndex = 0;
    botCardIndex = 0;
    cards.forEach(card => {
        if (card.location === CardLocation.DECK) {
            card.targetX = Places.DECK[0];
            card.targetY = Places.DECK[1];
        } else if (card.location === CardLocation.TABLE) {
            card.targetX = Places.TABLE[0];
            card.targetY = Places.TABLE[1];
        } else if (card.location === CardLocation.PLAYER) {
            card.targetX = Places.HAND_START[0] + playerCardIndex * (cardSize[0] * 1.25) - scrlIndex;
            card.targetY = Places.HAND_START[1];
            playerCardIndex++;
        } else if (card.location === CardLocation.BOT) {
            card.targetX = Places.BOT_START[0] + botCardIndex * (cardSize[0] * 1.25);
            card.targetY = Places.BOT_START[1];
            botCardIndex++;
        }
        card.updateAnimation();
    });
    if (keys["a"] || keys["ArrowLeft"]){
        scrlIndex -= 10;
    }else if (keys["d"] || keys["ArrowRight"]){
        scrlIndex += 10;
    }
    scrlIndex = _.clamp(scrlIndex, 0, playerCardIndex * (cardSize[0] * 1.25)- 15 * (cardSize[0] * 1.25));
    const cardsInDeck = cards.filter(c => c.location === CardLocation.DECK).length;
    const cardsInTable = cards.filter(c => c.location === CardLocation.TABLE).length;
    if (cardsInDeck === 0 && cardsInTable > 1) {
        let tableStack = cards.filter(c => c.location === CardLocation.TABLE);
        const topTableCard = tableStack.pop(); 
        tableStack.forEach(card => {
            card.goTo(CardLocation.DECK);
            card.reversed = true;
        });
        let deckCards = cards.filter(c => c.location === CardLocation.DECK);
    
        deckCards = _.shuffle(deckCards);
        const playerHandCards = cards.filter(c => c.location === CardLocation.PLAYER);
        const botHandCards = cards.filter(c => c.location === CardLocation.BOT);
        
        cards = [
            ...deckCards,     
            ...playerHandCards,
            ...botHandCards,
            topTableCard      
        ];

    }

    if (playerCardIndex === 0 || botCardIndex === 0){
        ended = true;
        let div = document.createElement('div');
        let h1 = document.createElement('h1');
        let button = document.createElement('button');

        if (playerCardIndex === 0) {
            h1.innerHTML = "PLAYER WON!";
        } else if (botCardIndex === 0) {
            h1.innerHTML = "BOT WON!";
        }

        button.innerText = "Restart!";
        button.addEventListener("click", () => {
            window.location.reload();
        });

        div.appendChild(h1);
        div.appendChild(button);

        //  KLUCZOWE: Wrzucamy do body strony, a nie do canvasu!
        document.body.appendChild(div);

        // ==========================================
        // CZARODZIEJSKI CSS STYLIZOWANY W JAVASCRIPT
        // ==========================================
        // Sprawia, że DIV unosi się dokładnie nad środkiem Canvasu

        // 1. Pozycjonowanie absolutne na środku ekranu
        div.style.position = "absolute";
        div.style.top = "50%";
        div.style.left = "50%";
        div.style.transform = "translate(-50%, -50%)"; // Idealne wycentrowanie

        // 2. Ładny wygląd okienka (Pop-up)
        div.style.background = "rgba(0, 0, 0, 0.9)"; // Czarne, lekko przezroczyste tło
        div.style.padding = "40px";
        div.style.borderRadius = "15px";
        div.style.border = "3px solid white";
        div.style.textAlign = "center";
        div.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)";

        // 3. Styl tekstu H1
        h1.style.color = playerCardIndex === 0 ? "lime" : "red"; // Zielony dla gracza, czerwony dla bota
        h1.style.fontFamily = "Arial, sans-serif";
        h1.style.margin = "0 0 20px 0";

        // 4. Styl przycisku Restart
        button.style.padding = "10px 30px";
        button.style.fontSize = "18px";
        button.style.fontWeight = "bold";
        button.style.cursor = "pointer";
        button.style.border = "none";
        button.style.borderRadius = "5px";
        button.style.backgroundColor = "#fff";
        button.style.color = "#000";

        // Mały efekt podświetlenia przycisku
        button.addEventListener("mouseover", () => button.style.backgroundColor = "#ddd");
        button.addEventListener("mouseleave", () => button.style.backgroundColor = "#fff");
    }

    if (startBot){
        startBot = false;
        botWaiting = true;
        await wait(1000);
        botWaiting = false;
        topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
        topTableCard = cards.filter(c => c.location === CardLocation.TABLE).at(-1);
        
        let moved = false;  
        _.shuffle(cards).forEach(card => {
            if (card.location === CardLocation.BOT && !moved) {
                if (canPlace(card)) {
                    card.goTo(CardLocation.TABLE);
                    cards.splice(cards.indexOf(card),1)
                    cards.push(card)
                    card.reversed = false;
                    moved = true;
                    switch(card.sign){
                        case "2":
                            _.range(2).forEach(i =>{
                                topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                                if (topDeckCard){
                                    topDeckCard.goTo(CardLocation.PLAYER);
                                    topDeckCard.reversed = false;
                                }
                            })
                            startBot = true;
                        break
                        case "3":
                            _.range(3).forEach(i =>{
                                topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                                if (topDeckCard){
                                    topDeckCard.goTo(CardLocation.PLAYER);
                                    topDeckCard.reversed = false;
                                }
                            })
                            startBot = true;
                        break
                        case "4":
                            startBot = true;
                        break
                        case "K":
                            if (card.color === "♥" || card.color === "♠"){
                                _.range(5).forEach(i =>{
                                    topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                                    if (topDeckCard){
                                        topDeckCard.goTo(CardLocation.PLAYER);
                                        topDeckCard.reversed = false;
                                    }
                                })
                            startBot = true;
                            }
                        break
                        default:
                            startBot = false;
                        break
                    }
                };
            };
        });
        if (topDeckCard && !moved) {
            topDeckCard.goTo(CardLocation.BOT);
            topDeckCard.reversed = true;
        };
    };
};
function canPlace(card){
    topTableCard = cards.filter(c => c.location === CardLocation.TABLE).at(-1);
    return (card.sign === topTableCard.sign || card.color === topTableCard.color || card.sign === "Q" || topTableCard.sign === "Q")
}
function draw() {
    ctx.fillStyle = "darkgreen";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineWidth = 5;
    ctx.strokeStyle = "white";
    

    ctx.strokeRect(...Places.TABLE, cardSize[0], cardSize[1]);
    ctx.strokeRect(...Places.DECK, cardSize[0], cardSize[1]);
    if (botWaiting){
        ctx.fillStyle = "red";
    }else{
        ctx.fillStyle = "green";
    }
    ctx.strokeStyle = "black";
    ctx.fillRect(canvas.width / 2 + cardSize[0], canvas.height / 2 - 16, 32, 32);
    ctx.strokeRect(canvas.width / 2 + cardSize[0], canvas.height / 2 - 16,32, 32);

    let deckCount = 0;
    let tableCount = 0;
    topTableCard = cards.filter(c => c.location === CardLocation.TABLE).at(-1);
    cards.forEach(card => {
        if (card.location === CardLocation.DECK) {
            card.draw(deckCount * 0.5, -deckCount * 0.5);
            deckCount++;
        } else if (card.location === CardLocation.TABLE) {
            card.draw(tableCount * 0.5, -tableCount * 0.5);
            tableCount++;
        } else if (card.location === CardLocation.PLAYER) {
            if (canPlace(card)){
                ctx.globalAlpha = 1;
                ctx.filter = "none";
            }else{
                ctx.globalAlpha = 0.75;
                ctx.filter = "brightness(50%)";
            }
            if (botWaiting){
                ctx.globalAlpha = 0.75;
                ctx.filter = "brightness(50%)";
            }
            card.draw(0, 0);
            ctx.globalAlpha = 1;
            ctx.filter = "none";
        } else if (card.location === CardLocation.BOT) {
            card.draw(0, 0);
        }
    });
    if (gameCoin.isSpinning){
        gameCoin.draw(ctx)
    }else if (drawCoinAfter > 0){
        if (drawCoinAfter === 50){
            _.range(5).forEach(i => {
                cards.at(-1).location = CardLocation.TABLE;
                cards.at(-1).reversed = false;
                let topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                if (topDeckCard) {
                    topDeckCard.location = CardLocation.PLAYER;
                    topDeckCard.reversed = false;
                    
                }
                topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
                if (topDeckCard) {
                    topDeckCard.location = CardLocation.BOT;
                    topDeckCard.reversed = true;
                }
            })
        } 
        gameCoin.draw(ctx)
        drawCoinAfter--;
    }
}

function gameLoop() {
    update();
    draw();
    if (!ended){
        requestAnimationFrame(gameLoop); 
    }else{
        cards.forEach(c => {c.x = c.targetX;c.y = c.targetY});
        draw();
    }
}
async function start(){
    gameCoin.flip()
    gameLoop()
}
const imgBack = new Image();
imgBack.src = `cards/Back.png`;
const imgBot = new Image();
imgBot.src = `cards/Back.png`;
const imgPlayer = new Image();
imgPlayer.src = `cards/Back.png`;
const imgBotCoin = new Image();
imgBotCoin.src = `cards/BotCoin.png`;
const imgPlayerCoin = new Image();
imgPlayerCoin.src = `cards/PlayerCoin.png`;
const cardImages = {"Back": imgBack,"0": imgPlayerCoin,"1": imgBotCoin};

let totalImages = 0;
let loadedImages = 0;

cards.forEach(card => {
    const cardName = `${card.color}${card.sign}`;
    const src = `cards/${cardName}.png`;

    totalImages++;
    const img = new Image();
    img.src = src;
    cardImages[cardName] = img;

    img.onload = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
            start();
        }
    };
    img.onerror = () => {
        console.error(`Nie wczytano: ${src}`);
        loadedImages++;
    };
});
