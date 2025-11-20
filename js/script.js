function toggleMenu() {
  const nav = document.getElementById("navMenu");
  nav.style.display = nav.style.display === "flex" ? "none" : "flex";
}

function scrollToAppointment() {
  document.getElementById("appointment").scrollIntoView({ behavior: "smooth" });
}

document
  .getElementById("appointmentForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    alert("Appointment submitted successfully!");
  });



<script>
function toggleMenu() {
  const nav = document.querySelector("nav");

  if (nav.style.display === "flex") {
    nav.style.display = "none";
  } else {
    nav.style.display = "flex";
  }
}
</script>
