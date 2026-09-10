// Diagramme de Pareto
document.addEventListener('DOMContentLoaded', async () => {
    const ctx = document.getElementById('paretoChart');
    if (!ctx) {
        console.error("Élément <canvas id='paretoChart'> introuvable.");
        return;
    }

    try {
        // 1. Récupération des données depuis IndexedDB
        const historique = await db.historiqueMessages.toArray();
        // Test du contenu de tableau historique
        if (!historique || historique.length === 0) {
            console.warn("Aucun historique trouvé dans IndexedDB pour le Pareto.");
            return;
        }

        // 2. Comptage des occurrences par motif/événement
        const compteurs = {};
        historique.forEach(item => {
            const cle = item.event || item.msgNr || "Inconnu";
            compteurs[cle] = (compteurs[cle] || 0) + 1;
        });

        // 3. Tri décroissant des fréquences
        // .entries() prend un tableau en entrée et le ressort sous forme ["clé", valeur]
        const tri = Object.entries(compteurs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Conservation du TOP 10 des défauts les plus fréquents

        const labels = tri.map(item => item[0]);  // Stockage des 10 noms des défauts fréquents
        const donneesFrequence = tri.map(item => item[1]);  // Stockage des occurences des défauts fréquents

        // 4. Calcul du cumul et du pourcentage cumulé
        const totalOccurrences = donneesFrequence.reduce((a, b) => a + b, 0);
        let sommeCumulee = 0;
        const donneesCumul = donneesFrequence.map(valeur => {
            sommeCumulee += valeur;
            return ((sommeCumulee / totalOccurrences) * 100).toFixed(1);
        });

        // 5. Instanciation du graphique Pareto (Double axe Y : Bâtons + Ligne)
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Pourcentage cumulé (%)',
                        data: donneesCumul,
                        type: 'line',
                        borderColor: '#e74c3c',
                        backgroundColor: '#e74c3c',
                        borderWidth: 2,
                        yAxisID: 'yCumul',
                        tension: 0.2,
                        pointRadius: 4
                    },
                    {
                        label: 'Nombre d\'occurrences',
                        data: donneesFrequence,
                        backgroundColor: '#3498db',
                        borderRadius: 4,
                        yAxisID: 'yFrequence'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            display: false
                        },
                        grid: {
                            drawBorder: false
                        }
                    },
                    yFrequence: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Occurrences'
                        }
                    },
                    yCumul: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        max: 100,
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: value => `${value}%`
                        },
                        title: {
                            display: true,
                            text: 'Cumul %'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });

    } catch (erreur) {
        console.error("Erreur lors de la génération du Pareto :", erreur);
    }
});

// DOUGHNUT
document.addEventListener('DOMContentLoaded', async () => {
    const ctx = document.getElementById('typeDoughnutChart');
    // Vérification de l'existence de la variable pourdoughnut dans html(canvas)
    if (!ctx) {
        console.error("Élément <canvas id='typeDoughnutChart'> introuvable.");
        return;
    }

    try {
        // 1. Récupération des données dans IndexedDB
        const historique = await db.historiqueMessages.toArray();

        // 2. Comptage par catégorie 
        let nbreDefauts = 0;
        let nbreAvertissements = 0;
        let nbreIndications = 0;

        historique.forEach(item => {
            const type = (item.alarmType || "").toLowerCase();

            if (type.includes('fault') || type.includes('incident') || type.includes('firstfault')) {
                nbreDefauts++;
            } else if (type.includes('note')) {
                nbreIndications++;
            } else {
                nbreAvertissements++;
            }
        });

        // 3. Instanciation du graphique Doughnut
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Défauts / Incidents', 'Avertissements', 'Indications'],
                datasets: [{
                    data: [nbreDefauts, nbreAvertissements, nbreIndications],
                    backgroundColor: [
                        '#dc3545', // Rouge pour les défauts
                        '#ffc107', // Jaune/Orange pour les avertissements
                        '#0dcaf0'  // Bleu clair pour les indications
                    ],
                    borderColor: '#1e1e1e', // Couleur de bordure assortie au thème sombre
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            font: { size: 12 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const valeur = context.raw;
                                const pourcentage = ((valeur / total) * 100).toFixed(1);
                                return ` ${context.label}: ${valeur} (${pourcentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%' // Épaisseur de l'anneau du beignet
            }
        });

    } catch (erreur) {
        console.error("Erreur lors du traitement du diagramme en beignet :", erreur);
    }
});



// Types de modules les plus affectés-DOUGHNUT
(async function initOrganesDoughnutChart() {
    const ctxOrganes = document.getElementById('organesDoughnutChart');
    if (!ctxOrganes) return;

    try {
        const donneeHistorique = await db.historiqueMessages.toArray();

        if (!donneeHistorique || donneeHistorique.length === 0) {
            console.warn("Organes: Aucun historique trouvé.");
            return;
        }

        // Comptage des occurrences par module/organe
        const compteurs = {};
        donneeHistorique.forEach(msg => {
            const organe = msg.modul && msg.modul !== "-" ? msg.modul : "Non spécifié";
            compteurs[organe] = (compteurs[organe] || 0) + 1;
        });

        // Tri décroissant
        const trie = Object.entries(compteurs).sort((a, b) => b[1] - a[1]);

        // Conservation du Top 5 + Regroupement "Autres"
        const top5 = trie.slice(0, 5);
        const reste = trie.slice(5);

        const labels = top5.map(item => item[0]);
        const data = top5.map(item => item[1]);

        if (reste.length > 0) {
            const totalAutres = reste.reduce((acc, item) => acc + item[1], 0);
            labels.push("Autres");
            data.push(totalAutres);
        }

        // Destruction de l'instance existante si présente
        const instanceExistante = Chart.getChart(ctxOrganes);
        if (instanceExistante) {
            instanceExistante.destroy();
        }

        // Palette de couleurs pour les organes
        const couleurs = ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#20c997', '#6c757d'];

        new Chart(ctxOrganes, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: couleurs.slice(0, labels.length),
                    borderColor: '#1e1e1e',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#ffffff',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const val = context.raw;
                                const pct = ((val / total) * 100).toFixed(1);
                                return ` ${context.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });

    } catch (err) {
        console.error("Erreur Graphique Organes :", err);
    }
})();



// Temps d'arrivée défauts par jours
(async function initChronologieChart() {
    const ctxChrono = document.getElementById('chronologieChart');
    if (!ctxChrono) return;

    try {
        const donneeHistorique = await db.historiqueMessages.toArray();

        if (!donneeHistorique || donneeHistorique.length === 0) {
            console.warn("Chronologie: Aucun historique trouvé.");
            return;
        }

        // 1. Extraction et comptage par date/heure
        const compteursParDate = {};

        donneeHistorique.forEach(msg => {
            if (msg.comes && msg.comes !== "-") {
                // Extraction de la date (ex: prend la date ou l'heure selon le format stocké)
                // Ajuste la découpe selon le format exact de ta chaîne 'comes' (ex: "YYYY-MM-DD" ou "HH:00")
                const horodatage = msg.comes.split(' ')[0] || msg.comes; 
                compteursParDate[horodatage] = (compteursParDate[horodatage] || 0) + 1;
            }
        });

        // 2. Tri chronologique des dates
        const datesTriees = Object.keys(compteursParDate).sort();
        const valeursOccurrences = datesTriees.map(d => compteursParDate[d]);

        // 3. Destruction de l'instance existante si présente
        const instanceExistante = Chart.getChart(ctxChrono);
        if (instanceExistante) {
            instanceExistante.destroy();
        }

        // 4. Instanciation du Graphique en Ligne / Historigramme
        new Chart(ctxChrono, {
            type: 'line',
            data: {
                labels: datesTriees,
                datasets: [{
                    label: 'Nombre d\'alarmes',
                    data: valeursOccurrences,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.15)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3, // Courbure de la ligne
                    pointRadius: 3,
                    pointBackgroundColor: '#0d6efd'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: '#cccccc',
                            maxRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: 'Volume d\'occurrences',
                            color: '#ffffff'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });

    } catch (err) {
        console.error("Erreur Graphique Chronologie :", err);
    }
})();