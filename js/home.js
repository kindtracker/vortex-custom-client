import { createViewer } from "/js/avatar.js";

const Proxy = "/proxy";
const APIBase = Proxy + "/api";
const APIGames = APIBase + "/games";
const APICatalog = APIBase + "/catalog/init";
const APIMe = Proxy + "/me";
const AssetsBase = Proxy + "/assets";

async function GetContentFromAPI(Url) {
  const Response = await fetch(Url);
  const Data = await Response.json();
  return Data;
}

async function Main() {
  const MeData = await GetContentFromAPI(APIMe);

  const HomeGreeting = document.querySelector("#HomeGreeting");
  HomeGreeting.innerHTML = `Hello, ${MeData.username}`;

  const CatalogData = await GetContentFromAPI(APICatalog, {
    width: 170,
    height: 220,
    interactive: false,
    transparent: true,
    facingOffsetDeg: 25,
  });

  const Viewer = createViewer(document.getElementById("AvatarViewer"));
  Viewer.LoadOutfit(CatalogData);

  const GamesData = await GetContentFromAPI(APIGames);
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
