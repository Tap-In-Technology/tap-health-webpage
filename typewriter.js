// === Typewriter Text Animation ===
const phrases = [
    "Tired of filling out the same forms?",
    "Filling out forms is outdated!!",
    "Upgrade your patients' experience today."
];
let i = 0, j = 0, currentPhrase = [], isDeleting = false, isEnd = false;

function typeLoop() {
    const typewriter = document.getElementById('typewriter');
    if (!typewriter) return;

    typewriter.innerHTML = currentPhrase.join('');

    if (i < phrases.length) {
        if (!isDeleting && j <= phrases[i].length) {
            currentPhrase.push(phrases[i][j]);
            j++;
        }
        if (isDeleting && j > 0) {
            currentPhrase.pop();
            j--;
        }
        if (j === phrases[i].length) {
            isEnd = true;
            isDeleting = true;
        }
        if (isDeleting && j === 0) {
            currentPhrase = [];
            isDeleting = false;
            i = (i + 1) % phrases.length;
        }
    }
    const speed = isEnd ? 1000 : isDeleting ? 50 : 100;
    isEnd = false;
    setTimeout(typeLoop, speed);
}
typeLoop(); // Begin the animation loop