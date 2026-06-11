const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let cardSize = [96,128];
let startBot = false;
const Places = Object.freeze({
    DECK: [canvas.width / 2 - cardSize[0] / 2 - cardSize[0] * 4, canvas.height / 2 - cardSize[1] / 2],
    TABLE: [canvas.width / 2 - cardSize[0] / 2, canvas.height / 2 - cardSize[1] / 2],
    HAND_START: [cardSize[1]*1.5625, canvas.height - cardSize[1]*1.5625],
    BOT_START: [cardSize[1]*1.5625, cardSize[1]*1.5625-cardSize[1]]
});

const CardLocation = Object.freeze({
    DECK: "DECK",
    TABLE: "TABLE",
    PLAYER: "PLAYER",
    BOT: "BOT"
});

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


    draw(nx, ny) {
        const img = cardImages[this.toString()];
        if (img) {
            ctx.drawImage(img, this.x + nx, this.y + ny,...cardSize);
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

cards.at(-1).location = CardLocation.TABLE;
cards.at(-1).reversed = false;
_.range(7).forEach(i => {
    let topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
    if (topDeckCard) {
        topDeckCard.location = CardLocation.PLAYER;
        topDeckCard.reversed = false;
        
    }
    topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
    if (topDeckCard) {
        topDeckCard.location = CardLocation.BOT;
        topDeckCard.reversed = false;
        ////////////////////////
    }
})
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
    

    let clickedCard = null;

    cards.forEach(card => {
        if (x > card.x && x < card.x + cardSize[0] &&
            y > card.y && y < card.y + cardSize[1]) {
            clickedCard = card;
        }
    });

    if (clickedCard) {
    
        if (clickedCard.location === CardLocation.DECK) {
        
            topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
            if (topDeckCard) {
                topDeckCard.location = CardLocation.PLAYER;
                topDeckCard.reversed = false;
                startBot = true;
            }
        }
    
        else if (clickedCard.location === CardLocation.PLAYER) {
        
            let topTableCard = cards.filter(c => c.location === CardLocation.TABLE).at(-1);
            
        
            if (clickedCard.sign === topTableCard.sign || clickedCard.color === topTableCard.color) {
                clickedCard.location = CardLocation.TABLE;
                cards.splice(cards.indexOf(clickedCard),1)
                cards.push(clickedCard)
                startBot = true;
            } else {
                console.log("Ta karta nie pasuje!");
            }
        }
    }
});

function update() {
 
    let playerCardIndex = 0;
    let botCardIndex = 0;
    
    cards.forEach(card => {
        if (card.location === CardLocation.DECK) {
            card.x = Places.DECK[0];
            card.y = Places.DECK[1];
        } else if (card.location === CardLocation.TABLE) {
            card.x = Places.TABLE[0];
            card.y = Places.TABLE[1];
        } else if (card.location === CardLocation.PLAYER) {
            card.x = Places.HAND_START[0] + playerCardIndex * (cardSize[0]*1.25);
            card.y = Places.HAND_START[1];
            playerCardIndex++;
        } else if (card.location === CardLocation.BOT) {
            card.x = Places.BOT_START[0] + botCardIndex * (cardSize[0]*1.25);
            card.y = Places.BOT_START[1];
            botCardIndex++;
        }
    });
    if (playerCardIndex + botCardIndex === 0){
        let div = document.createElement('div');
        let h1 = document.createElement('h1');
        let button = document.createElement('button');
        if (playerCardIndex == 0){
            h1.innerHTML = "PLAYER WON!";
        }else if (botCardIndex == 0){
            h1.innerHTML = "BOT WON!";
        };
        button.innerText = "Restart!";

        button.addEventListener("click", () => {
            window.location.reload();
        });
        div.appendChild(h1);
        div.appendChild(button);
        canvas.replaceWith(div);
    }

    if (startBot){
        startBot = false;
        topDeckCard = cards.filter(c => c.location === CardLocation.DECK).at(-1);
        topTableCard = cards.filter(c => c.location === CardLocation.TABLE).at(-1);
            
        let moved = false;  
        _.shuffle(cards).forEach(card => {
            if (card.location === CardLocation.BOT && !moved) {
                if (card.sign === topTableCard.sign || card.color === topTableCard.color) {
                    card.location = CardLocation.TABLE;
                    cards.splice(cards.indexOf(card),1)
                    cards.push(card)
                    card.reversed = false;
                    moved = true;
                };
            };
        });
        if (topDeckCard && !moved) {
            topDeckCard.location = CardLocation.BOT;
            topDeckCard.reversed = false;
            ////////////////////////
        };
        // console.log(moved)
    };
};

function draw() {
    ctx.fillStyle = "darkgreen";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineWidth = 5;
    ctx.strokeStyle = "white";
    

    ctx.strokeRect(...Places.TABLE, cardSize[0], cardSize[1]);
    ctx.strokeRect(...Places.DECK, cardSize[0], cardSize[1]);


    let deckCount = 0;
    let tableCount = 0;

    cards.forEach(card => {
        if (card.location === CardLocation.DECK) {
            card.draw(deckCount * 0.5, -deckCount * 0.5);
            deckCount++;
        } else if (card.location === CardLocation.TABLE) {
            card.draw(tableCount * 0.5, -tableCount * 0.5);
            tableCount++;
        } else if (card.location === CardLocation.PLAYER) {
            card.draw(0, 0);
        } else if (card.location === CardLocation.BOT) {
            card.draw(0, 0);
        }
    });
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop); 
}
const imgBack = new Image();
imgBack.src = `cards/Back.png`;
const cardImages = {"Back": imgBack};

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
            gameLoop();
        }
    };
    img.onerror = () => {
        console.error(`Nie wczytano: ${src}`);
        loadedImages++;
    };
});
