export class JanusStudyEngine {
    
    // --- LERNFORTSCHRITT (STUDY LEVELS) ---
    static async addStudyProgress(actor, subject, qs) {
        if (!actor) return;

        let flagKey = `study_level_${subject.replace(/\s+/g, '_')}`;
        let currentProgress = actor.getFlag("janus7", flagKey) || 0;
        let newProgress = currentProgress + qs;
        
        await actor.setFlag("janus7", flagKey, newProgress);
        
        ui.notifications.info(`[Janus7 Studium] ${actor.name} sammelt ${qs} QS in ${subject}. (Gesamt: ${newProgress})`);
        
        // Visuelles Feedback für Taktiker
        if (newProgress >= 10 && currentProgress < 10) {
            ui.notifications.info(`📚 ${actor.name} hat ein solides Grundverständnis in ${subject} erreicht!`);
        }
    }

    // --- KLAUSUR-AUSWERTUNG (EXAM GRADING) ---
    static async evaluateExam(actor, examId) {
        // Lade die JSON-Definition der Klausur
        const examDef = await Janus7.ContentLoader.getQuest(examId);
        if (!examDef || examDef.type !== "academy_exam") return;

        let passedAll = true;
        let resultsHtml = `<h3>Prüfungsergebnisse: ${actor.name}</h3><ul>`;

        // Prüfe alle geforderten Fächer
        for (const [subject, reqQS] of Object.entries(examDef.state.requirements)) {
            let flagKey = `study_level_${subject.replace(/\s+/g, '_')}`;
            let studentQS = actor.getFlag("janus7", flagKey) || 0;
            
            if (studentQS >= reqQS) {
                resultsHtml += `<li style="color: green;">${subject}: ${studentQS}/${reqQS} QS - <b>Bestanden</b></li>`;
            } else {
                resultsHtml += `<li style="color: red;">${subject}: ${studentQS}/${reqQS} QS - <b>Durchgefallen</b></li>`;
                passedAll = false;
            }
        }
        resultsHtml += `</ul>`;

        // Konsequenzen triggern
        if (passedAll) {
            resultsHtml += `<p><b>Resultat: GLORREICH BESTANDEN!</b></p>`;
            // Hier Hook/Logik für "pass" Konsequenzen aus dem JSON feuern
            ui.notifications.info(`${actor.name} hat die Klausur bestanden!`);
        } else {
            resultsHtml += `<p><b>Resultat: DURCHGEFALLEN! (Arrest droht)</b></p>`;
            // Hier Hook/Logik für "fail" Konsequenzen feuern
            ui.notifications.error(`${actor.name} ist in der Klausur durchgefallen!`);
        }

        ChatMessage.create({
            speaker: { alias: "Examinatio-Auswertung" },
            content: resultsHtml,
            whisper: [game.user.id] // Zuerst nur an den GM
        });
    }
}
