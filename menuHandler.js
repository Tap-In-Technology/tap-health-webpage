document.addEventListener('DOMContentLoaded', function() {
    // Only try to add event listeners if the elements exist
    function safeAddEventListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        }
    }
    
    // Replace direct event listener assignments with this function
    safeAddEventListener('open', 'click', function() {
        MenuHandler(true);
    });
    
    safeAddEventListener('close', 'click', function() {
        MenuHandler(false);
    });
    
    // Your existing MenuHandler function
    window.MenuHandler = function(flag) {
        if (flag) {
            document.getElementById("list")?.classList.remove("hidden");
            document.getElementById("close")?.classList.remove("hidden");
            document.getElementById("open")?.classList.add("hidden");
        } else {
            document.getElementById("list")?.classList.add("hidden");
            document.getElementById("close")?.classList.add("hidden");
            document.getElementById("open")?.classList.remove("hidden");
        }
    }

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

    safeAddEventListener('next', 'click', goNext);
    safeAddEventListener('prev', 'click', goPrev);
    document.addEventListener("keydown", function (e) {
        if (e.code === "ArrowRight") {
            goNext();
        } else if (e.code === "ArrowLeft") {
            goPrev();
        }
    });
});
