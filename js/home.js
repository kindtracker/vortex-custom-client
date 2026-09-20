import { createViewer } from "/js/avatar.js";

const Proxy = "/proxy";
const APIBase = Proxy + "/api";
const APIGames = APIBase + "/games";
const APICatalog = APIBase + "/catalog/init";
const APIFriends = APIBase + "/friends";
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

  const CatalogData = await GetContentFromAPI(APICatalog);
  const Viewer = createViewer(document.getElementById("AvatarViewer"), {
    Width: 170,
    Height: 220,
    Interactive: true,
    Transparent: true,
    AutoRotate: false,
    FacingOffsetDeg: 25
  });
  Viewer.LoadOutfit(CatalogData);

  const FriendsData = await GetContentFromAPI(APIFriends);
  const FriendsAvatar = await window.FetchAvatars(
    FriendsData.map((FriendData) => FriendData.id)
  );
  const FriendsRow = document.querySelector(".FriendsRow");

  for (const FriendData of FriendsData.slice(0, 6)) {
    const Card = document.createElement("div");
    Card.className = "FriendCard";

    Card.innerHTML = `
      <img class="FriendImage" src="${FriendsAvatar.get(String(FriendData.id))}" alt="Friend">
      <div class="FriendCardContent">
        <span class="FriendCardName">${FriendData.username}</span>
        <span class="FriendCardStatus">${FriendData.online_status}</span>
      </div>
    `;

    FriendsRow.appendChild(Card);
  }

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
