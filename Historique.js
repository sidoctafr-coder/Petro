document.addEventListener('DOMContentLoaded', async () => {
    try {
        const tbody = document.getElementById('tbody-historiquemessages'); 
        const historique = await db.historiqueMessages.toArray();
        const compteur = historique.length;
        document.getElementById('compteur').textContent = compteur;

        let htmlGenerer = "";
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:10px;">Aucun message actif dans ce fichier.</td></tr>`;
        historique.forEach(a => {
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
    

}catch (erreur) {
    console.log("Erreur de lecture:", erreur);
}
});