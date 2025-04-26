//todo delete

document.addEventListener('DOMContentLoaded', function() {
    // Get the menu elements
    const openButton = document.getElementById('open');
    const closeButton = document.getElementById('close');
    const menuList = document.getElementById('list');
    
    // Only attach event listeners if the elements exist
    if (openButton) {
        openButton.addEventListener('click', function() {
            toggleMenu(true);
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            toggleMenu(false);
        });
    }
    
    // Function to toggle menu visibility
    function toggleMenu(isOpen) {
        if (!menuList || !openButton || !closeButton) return;
        
        if (isOpen) {
            menuList.classList.remove("hidden");
            closeButton.classList.remove("hidden");
            openButton.classList.add("hidden");
        } else {
            menuList.classList.add("hidden");
            closeButton.classList.add("hidden");
            openButton.classList.remove("hidden");
        }
    }
    
    // Make the function available globally if needed elsewhere
    window.MenuHandler = toggleMenu;

    // slider js starts
    let slides = document.querySelectorAll(".slide-ana>div");
    let slideSayisi = slides.length;

    let prev = document.getElementById("prev");
    let next = document.getElementById("next");
    for (let index = 0; index < slides.length; index++) {
        const element = slides[index];
        element.style.transform = "translateX(" + 100 * index + "%)";
    }
    let loop = 0 + 1000 * slideSayisi;

    function goNext() {
        loop++;
        for (let index = 0; index < slides.length; index++) {
            const element = slides[index];
            element.style.transform = "translateX(" + 100 * (index - (loop % slideSayisi)) + "%)";
        }
    }

    function goPrev() {
        loop--;
        for (let index = 0; index < slides.length; index++) {
            const element = slides[index];
            element.style.transform = "translateX(" + 100 * (index - (loop % slideSayisi)) + "%)";
        }
    }

    if (next) {
        next.addEventListener('click', goNext);
    }

    if (prev) {
        prev.addEventListener('click', goPrev);
    }

    document.addEventListener("keydown", function (e) {
        if (e.code === "ArrowRight") {
            goNext();
        } else if (e.code === "ArrowLeft") {
            goPrev();
        }
    });
});
