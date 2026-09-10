// Transition de l'icone au démarrage
window.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('app-splash');

    // Vérifie si le splash a déjà été affiché durant cette session
    if (sessionStorage.getItem('splashShown')) {
        // Si oui, on masque immédiatement l'écran de splash sans animation
        if (splash) {
            splash.style.display = 'none';
        }
    } else {
        // Si c'est le tout premier démarrage de l'app
        setTimeout(() => {
            if (splash) {
                splash.classList.add('hidden');
                // Marque le splash comme "déjà affiché" pour toute la session
                sessionStorage.setItem('splashShown', 'true');
            }
        }, 400);
    }
});

// Initialisation de la base de données IndexedDB via Dexie
const db = new Dexie("SouffleuseDiagnosticDB");

// Définition des tables (stores)
db.version(1).stores({
    alarmesActives: '++id',      // Alarmes en cours
    historiqueMessages: '++id, modul, event' // Historique des messages (pour le Pareto)
});


// HORLOGE
document.addEventListener('DOMContentLoaded', () => {
    function mettreAJourHorloge() {
        const maintenant = new Date();

        // Formatage HH:MM:SS avec ajout de zéro au début si < 10
        const heures = String(maintenant.getHours()).padStart(2, '0');
        const minutes = String(maintenant.getMinutes()).padStart(2, '0');
        const secondes = String(maintenant.getSeconds()).padStart(2, '0');

        const heure_format = `${heures}:${minutes}:${secondes}`;

        // Injection dans la page
        const horloge = document.getElementById('horloge-live');
        if (horloge) {
            horloge.textContent = heure_format;
        }
    }

    //Exécution immédiate au chargement
    mettreAJourHorloge();

    //Rafraîchissement chaque 1000ms
    setInterval(mettreAJourHorloge, 1000);
});

// TEST
document.addEventListener('DOMContentLoaded', () => {
    const btnMAJ = document.getElementById('btnMAJ');
    const inputExcel = document.getElementById('inputExcel');

    if (!btnMAJ || !inputExcel) {
        console.error("Bouton ou Input introuvable dans le DOM !");
        return;
    }

    btnMAJ.addEventListener('click', () => inputExcel.click());

    inputExcel.addEventListener('change', () => {
        const fichier = inputExcel.files[0];
        if (!fichier) return;

        const lecteur = new FileReader();

        lecteur.onload = async function (evenement) {
            try {
                const contenuTexte = evenement.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(contenuTexte, "text/xml");

                // ---EXTRACTION DE L'HISTORIQUE DES MESSAGES ---
                const nœudsHistorique = xmlDoc.querySelectorAll('Apartment[Type="Alarm History"] Alarm');
                const tableauHistorique = [];

                nœudsHistorique.forEach(alarm => {
                    tableauHistorique.push({
                        alarmType: alarm.querySelector('AlarmType')?.textContent?.trim() || "Incident",
                        comes: alarm.querySelector('Time > Comes')?.textContent?.trim() || "-",
                        goes: alarm.querySelector('Time > Goes')?.textContent?.trim() || "-",
                        modul: alarm.querySelector('Modul')?.textContent?.trim() || "-",
                        msgNr: alarm.querySelector('MsgNr')?.textContent?.trim() || "-",
                        event: alarm.querySelector('Event')?.textContent?.trim() || "-",
                        swRef: alarm.querySelector('SWRef')?.textContent?.trim() || "-"
                    });
                });
                // Extraction des nœuds d'alarmes actives
                const alarmes_actives = xmlDoc.querySelectorAll('Apartment[Type="Active Alarms"] Alarm');
                console.log("Nombre d'alarmes actives trouvées :", alarmes_actives.length);

                const tableau_final = [];

                alarmes_actives.forEach(alarm => {
                    tableau_final.push({
                        alarmType: alarm.querySelector('AlarmType')?.textContent?.trim() || "Warning",
                        comes: alarm.querySelector('Time > Comes')?.textContent?.trim() || "-",
                        modul: alarm.querySelector('Modul')?.textContent?.trim() || "-",
                        msgNr: alarm.querySelector('MsgNr')?.textContent?.trim() || "-",
                        event: alarm.querySelector('Event')?.textContent?.trim() || "-",
                        swRef: alarm.querySelector('SWRef')?.textContent?.trim() || "-"
                    });
                });

                // --- 3. SAUVEGARDE DANS INDEXEDDB VIA DEXIE ---
                await db.transaction('rw', [db.alarmesActives, db.historiqueMessages], async () => {
                    // Vidage des anciennes données
                    await db.alarmesActives.clear();
                    await db.historiqueMessages.clear();

                    // Insertion des nouveaux tableaux
                    await db.alarmesActives.bulkAdd(tableau_final);
                    await db.historiqueMessages.bulkAdd(tableauHistorique);
                });

                console.log("Données sauvegardées dans IndexedDB avec succès !");

                // Compteur de défauts
                const compteur = document.getElementById('compteur-actifs');
                if (compteur) {
                    compteur.textContent = tableau_final.length;
                }

                // Barre d'alerte

                const total = tableau_final.length;
                let nbre_defaut = 0;
                let nbre_avertissement = 0;
                let nbre_indication = 0;

                tableau_final.forEach(item => {
                    const type = (item.alarmType || "").toLowerCase();

                    if (type.includes('fault') || type.includes('incident') || type.includes('firstfault')) {
                        nbre_defaut++;
                    } else if (type.includes('note')) {
                        nbre_indication++;
                    } else {
                        nbre_avertissement++; // Avertissement par défaut
                    }
                });
                document.getElementById('txt-count-defaut').textContent = nbre_defaut;
                document.getElementById('txt-count-avertissement').textContent = nbre_avertissement;
                document.getElementById('txt-count-indication').textContent = nbre_indication;

                if (total > 0) {
                    const pourcentage_defaut = (nbre_defaut / total) * 100;
                    const pourcentage_indication = (nbre_indication / total) * 100;
                    const pourcentage_avertissement = (nbre_avertissement / total) * 100;

                    document.getElementById('barre-defaut').style.width = `${pourcentage_defaut}%`;
                    document.getElementById('barre-indication').style.width = `${pourcentage_indication}%`;
                    document.getElementById('barre-avertissement').style.width = `${pourcentage_avertissement}%`;
                } else {
                    document.getElementById('barre-defaut').style.width = '0%';
                    document.getElementById('barre-indication').style.width = '0%';
                    document.getElementById('barre-avertissement').style.width = '0%';
                }

                // INJECTION DANS LE TABLEAU HTML
                const tbody = document.getElementById('tbody-messages-actifs');
                if (!tbody) {
                    alert("Erreur : L'élément HTML <tbody id='tbody-messages-actifs'> n'existe pas dans votre page !");
                    return;
                }

                if (tableau_final.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:10px;">Aucun message actif dans ce fichier.</td></tr>`;
                } else {
                    // Génération des lignes du tableau
                    // Génération dynamique des lignes HTML avec les badges de couleur
                    let htmlGenerer = "";
                    tableau_final.forEach(a => {
                        // Détermination de la classe CSS selon le type
                        let classeBadge = "badge-warning";
                        let libelleType = a.alarmType; // Valeur par défaut
                        const type_alarme = (a.alarmType || "").toLowerCase();

                        if (type_alarme.includes('fault') || type_alarme.includes('incident') || type_alarme.includes('firstfault')) {
                            classeBadge = "badge-fault";
                            libelleType = "Défaut";
                        } else if (type_alarme.includes('note')) {
                            classeBadge = "badge-note";
                            libelleType = "Indication";
                        } else {
                            classeBadge = "badge-warning";
                            libelleType = "Avertissement";
                        }

                        htmlGenerer += `
    <tr>
      <td><span class="${classeBadge}">${libelleType}</span></td>
      <td><strong>${a.comes}</strong></td>
      <td>${a.modul}</td>
      <td>${a.msgNr}</td>
      <td>${a.event}</td>
      <td><code>${a.swRef}</code></td>
    </tr>
  `;
                    });






                    tbody.innerHTML = htmlGenerer;
                    console.log("Tableau HTML mis à jour avec succès !");
                }


            } catch (err) {
                console.error("Erreur lors de l'injection :", err);
            }
        };

        lecteur.readAsText(fichier);
    });
});




