/**
 * beaTunes beaTlet for Janus7 (V3 Format)
 * Exports selected songs to JANUS7 janus_audio_index_v3.json format.
 * 
 * This ensures compatibility between the deep Python Analyzer and manual beaTunes exports.
 */

import com.tagtraum.beatunes.action.AbstractSongSelectionAction
import com.tagtraum.beatunes.Song
import groovy.json.JsonBuilder
import javax.swing.JFileChooser
import javax.swing.filechooser.FileNameExtensionFilter

class JanusV3ExportAction extends AbstractSongSelectionAction {

    @Override String getId() { "JanusV3ExportAction" }
    @Override String getName() { "Export to Janus7 (V3 Index)..." }

    @Override
    void actionPerformed(java.awt.event.ActionEvent e) {
        Song[] songs = getSelectedSongs()
        if (songs.length == 0) return

        def chooser = new JFileChooser()
        chooser.dialogTitle = "Export Janus7 V3 Catalog"
        chooser.fileFilter = new FileNameExtensionFilter("JSON Files", "json")
        if (chooser.showSaveDialog(null) != JFileChooser.APPROVE_OPTION) return

        def file = chooser.selectedFile
        if (!file.name.endsWith(".json")) file = new File(file.absolutePath + ".json")

        def catalog = [
            generator_version: "beaTunes Janus-Bridge 1.0",
            generated_at: System.currentTimeMillis() / 1000,
            tracks: songs.collect { song ->
                def fullPath = song.getFile().absolutePath
                def foundryPath = fullPath
                if (fullPath.contains("modules/Janus7")) {
                    foundryPath = "modules/Janus7" + fullPath.split("modules/Janus7")[1].replaceAll("\\\\", "/")
                }

                // Map beaTunes Color to Janus Energy/Mood heuristics
                def energyLevel = mapColorToEnergy(song.color)
                
                return [
                    file_path: foundryPath,
                    rel_path: song.getFile().getName(),
                    title: song.title,
                    tags: [
                        mood: song.mood ? [song.mood.toLowerCase()] : [],
                        energy: energyLevel > 0.7 ? "high" : (energyLevel < 0.3 ? "low" : "medium"),
                        setting: [], 
                        situation: [],
                        theme: [],
                        instruments: [],
                        use_for: [],
                        genres: song.genre ? [song.genre.toLowerCase()] : []
                    ],
                    analysis: [
                        duration: song.duration / 1000.0,
                        tempo_bpm: song.bpm,
                        energy_level: energyLevel,
                        color: song.color,
                        key: song.key?.toString(),
                        notes: ["beatunes_export"]
                    ],
                    external: [
                        artist: song.artist,
                        album: song.album,
                        sources: ["beatunes"]
                    ]
                ]
            }
        ]

        file.text = new JsonBuilder(catalog).toPrettyString()
    }

    private float mapColorToEnergy(String color) {
        if (!color) return 0.5f
        color = color.toLowerCase()
        if (color.contains("red") || color.contains("orange") || color.contains("bright")) return 0.85f
        if (color.contains("dark") || color.contains("blue") || color.contains("black")) return 0.25f
        if (color.contains("green") || color.contains("yellow")) return 0.5f
        return 0.5f
    }
}
