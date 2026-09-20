const APIBase = "https://corsproxy.io/?key=webdemo1&url=https://playvortex.io/api";
const APIGames = APIBase + "/games";
const AssetsBase = "https://playvortex.io/assets";

async function GetContentFromAPI(Url) {
  const Response = await fetch(Url);
  const Data = await Response.json();
  return Data;
}

async function Main() {
  const GamesData = await GetContentFromAPI(APIGames);
  console.log(GamesData);

  const GameGrid = document.querySelector(".GameGrid");
  for (const GameData of GamesData) {
    const Card = document.createElement("div");
    Card.className = "GameCard";

    Card.innerHTML = `
      <img src="${AssetsBase}/thumbnails/${GameData.id}?v=${GameData.thumbnail_version}" alt="${GameData.name}">
      <div class="GameCardContent">
        <h3>${GameData.name}</h3>
        <div class="GameCardStats">
          <i class="fa-solid fa-users"></i>
          <span>${GameData.player_count}</span>
        </div>
      </div>
    `;

    GameGrid.appendChild(Card);
  }
}

Main();
