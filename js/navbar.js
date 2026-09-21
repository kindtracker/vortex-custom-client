async function LoadNavBar() {
  const Response = await fetch("/html/navbar.html");
  const Content = await Response.text();

  document.getElementById("NavBar").innerHTML = Content;

  const CurrentPath = window.location.pathname;

  document.querySelectorAll(".NavBarAction a").forEach((Link) => {
    if (Link.pathname === window.location.pathname) {
      Link.classList.add("Active");
    }
  });
}

LoadNavBar();
