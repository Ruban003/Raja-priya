// Main application initialization
document.addEventListener("DOMContentLoaded", function () {
  console.log("Elegance Beauty Website Loaded");

  // Initialize all components
  initNavigation();
  loadFeaturedServices();
});

// Featured services data (will later come from backend)
const featuredServices = [
  {
    id: 1,
    name: "Bridal Makeup",
    description: "Perfect wedding day look",
    price: "$150+",
  },
  {
    id: 2,
    name: "Evening Glam",
    description: "Special occasion makeup",
    price: "$100",
  },
  {
    id: 3,
    name: "Beauty Class - Beginner",
    description: "Learn basic techniques",
    price: "$75",
  },
];

function loadFeaturedServices() {
  const grid = document.querySelector(".services-grid");
  if (!grid) return;

  grid.innerHTML = featuredServices
    .map(
      (service) => `
        <div class="service-card">
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <span class="price">${service.price}</span>
        </div>
    `
    )
    .join("");
}
