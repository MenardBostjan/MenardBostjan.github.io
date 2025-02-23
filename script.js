const hitCounts = {};

document.querySelectorAll('.roulette-table > div, .number').forEach(field => {
    const fieldId = field.dataset.fieldId;
    hitCounts[fieldId] = 0;

    field.addEventListener('click', () => {
        hitCounts[fieldId]++;
        field.querySelector('.hit-count').textContent = hitCounts[fieldId];
    });
});
