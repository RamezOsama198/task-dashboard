$(document).ready(function () {
  const API_USERS = "https://jsonplaceholder.typicode.com/users";
  const API_POSTS = "https://jsonplaceholder.typicode.com/posts";
  const API_COMMENTS = (id) =>
    `https://jsonplaceholder.typicode.com/comments?postId=${id}`;

  let users = [];
  let posts = [];
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  const loader = $("#loader");

  function showLoader() {
    loader.removeClass("hidden");
  }
  function hideLoader() {
    loader.addClass("hidden");
  }

  // ===== Sidebar Navigation =====
  $(".menu-item").on("click", function (e) {
    e.preventDefault();
    $(".menu-item").removeClass("active");
    $(this).addClass("active");

    const target = $(this).data("target");
    $(".section").addClass("hidden").removeClass("active");
    $(`#${target}`).removeClass("hidden").addClass("active");
  });

  // ===== Theme Toggle =====
  $("#themeToggle").on("click", function () {
    $("body").toggleClass("theme-dark");
    toastr.info("Theme changed!");
  });

  // ===== Fetch Dashboard Stats =====
  async function loadDashboard() {
    try {
      showLoader();
      const [usersRes, postsRes, commentsRes] = await Promise.all([
        fetch(API_USERS),
        fetch(API_POSTS),
        fetch("https://jsonplaceholder.typicode.com/comments"),
      ]);

     const usersData = await usersRes.json();
       const postsData = await postsRes.json();
      const commentsData = await commentsRes.json();

      $("#stat-users").text(usersData.length);
        $("#stat-posts").text(postsData.length);
    $("#stat-comments").text(commentsData.length);
    } catch (err) {
      toastr.error("Failed to load dashboard data");
    } finally {
      hideLoader();
    }
  }

  // ===== Load Users Table =====
  async function loadUsers() {
    try {
      showLoader();
      const res = await fetch(API_USERS);
      users = await res.json();

      $("#usersTable").DataTable({
        data: users,
        destroy: true,
        columns: [
          { data: "id" },
          { data: "name" },
          { data: "email" },
          { data: "company.name" },
          {
            data: null,
            render: function (data) {
              const isFav = favorites.some((f) => f.id === data.id);
              return `
                <button class="btn ghost edit-user" data-id="${data.id}"><i class="fa fa-pen"></i></button>
                <button class="btn ghost delete-user" data-id="${data.id}"><i class="fa fa-trash"></i></button>
                <button class="btn ghost fav-user" data-id="${data.id}">
                  <i class="fa ${isFav ? "fa-star" : "fa-regular fa-star"}"></i>
                </button>
              `;
            },
          },
        ],
      });

      // Edit User
      $("#usersTable").on("click", ".edit-user", function () {
        const id = $(this).data("id");
        const user = users.find((u) => u.id === id);
        if (user) {
          toastr.info(`Edit user: ${user.name}`);
        }
      });

      // Delete User
      $("#usersTable").on("click", ".delete-user", function () {
        const id = $(this).data("id");
        users = users.filter((u) => u.id !== id);
        toastr.warning("User deleted!");
        loadUsers(); // reload table
      });

      // Favorite User
      $("#usersTable").on("click", ".fav-user", function () {
        const id = $(this).data("id");
        const user = users.find((u) => u.id === id);
        if (favorites.some((f) => f.id === id)) {
          favorites = favorites.filter((f) => f.id !== id);
          toastr.info("Removed from favorites");
        } else {
          favorites.push(user);
          toastr.success("Added to favorites!");
        }
        localStorage.setItem("favorites", JSON.stringify(favorites));
        loadUsers(); // refresh icons
        loadFavorites();
      });
    } catch (err) {
      toastr.error("Failed to load users");
    } finally {
      hideLoader();
    }
  }

  // ===== Favorites Section =====
  function loadFavorites() {
    const container = $("#favoritesList");
    container.empty();
    if (favorites.length === 0) {
      container.html("<p>No favorites yet.</p>");
      return;
    }
    favorites.forEach((f) => {
      container.append(`<div class="card"><strong>${f.name}</strong><br>${f.email}</div>`);
    });
  }

  // ===== Load Posts =====
  async function loadPosts() {
    try {
      showLoader();
      const res = await fetch(API_POSTS);
      posts = await res.json();
      renderPosts(posts);
    } catch (err) {
      toastr.error("Failed to load posts");
    } finally {
      hideLoader();
    }
  }

  function renderPosts(data) {
    const list = $("#postsList");
    list.empty();
    data.forEach((p) => {
      const card = $(`
        <div class="post-card" data-id="${p.id}">
          <h4>${p.title}</h4>
          <p>${p.body}</p>
          <div class="actions">
            <button class="btn ghost show-comments">Comments</button>
            <button class="btn ghost edit-post"><i class="fa fa-pen"></i></button>
            <button class="btn ghost delete-post"><i class="fa fa-trash"></i></button>
          </div>
          <div class="comments hidden"></div>
        </div>
      `);
      list.append(card);
    });
  }

  // Search posts
  $("#postSearch").on("keyup", function () {
    const q = $(this).val().toLowerCase();
    const filtered = posts.filter((p) =>
      p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)
    );
    renderPosts(filtered);
  });

  // Post Actions
  $("#postsList").on("click", ".delete-post", function () {
    const id = $(this).closest(".post-card").data("id");
    posts = posts.filter((p) => p.id !== id);
    toastr.warning("Post deleted!");
    renderPosts(posts);
  });

  $("#postsList").on("click", ".edit-post", function () {
    const id = $(this).closest(".post-card").data("id");
    const post = posts.find((p) => p.id === id);
    if (post) {
      toastr.info(`Edit post: ${post.title}`);
    }
  });

  $("#postsList").on("click", ".show-comments", async function () {
    const card = $(this).closest(".post-card");
    const id = card.data("id");
    const commentsBox = card.find(".comments");

    if (!commentsBox.hasClass("hidden")) {
      commentsBox.toggleClass("hidden");
      return;
    }

    try {
      showLoader();
      const res = await fetch(API_COMMENTS(id));
      const comments = await res.json();
      commentsBox.empty();
      comments.forEach((c) => {
        commentsBox.append(`<p><strong>${c.email}</strong>: ${c.body}</p>`);
      });
      commentsBox.removeClass("hidden");
    } catch {
      toastr.error("Failed to load comments");
    } finally {
      hideLoader();
    }
  });

  // Add Post
  $("#addPostBtn").on("click", function () {
    const newPost = {
      id: Date.now(),
      title: "New Post",
      body: "This is a new post created locally."
    };
    posts.unshift(newPost);
    toastr.success("Post added!");
    renderPosts(posts);
  });

  // ===== Init =====
  loadDashboard();
  loadUsers();
  loadFavorites();
  loadPosts();
});
