/**
 * beaTunes beaTlet for Janus7
 * Exports selected songs to JANUS7 music-catalog.json format.
 * 
 * Install: 
 * 1. Save as 'JanusExport.groovy' in beaTunes/Plugins directory.
 * 2. Restart beaTunes.
 * 3. Select songs, Go to Tools -> Export to Janus7.
 */

import com.tagtraum.beatunes.action.AbstractSongSelectionAction
import com.tagtraum.beatunes.Song
import groovy.json.JsonBuilder
import javax.swing.JFileChooser
import javax.swing.filechooser.FileNameExtensionFilter
import java.nio.file.Paths

class JanusExportAction extends AbstractSongSelectionAction {

    @Override
    String getId() { "JanusExportAction" }

    @Override
    String getName() { "Export to Janus7..." }

    @Override
    void actionPerformed(java.awt.event.ActionEvent e) {
        Song[] songs = getSelectedSongs()
        if (songs.length == 0) return

        def chooser = new JFileChooser()
        chooser.dialogTitle = "Export Janus7 Music Catalog"
        chooser.fileFilter = new FileNameExtensionFilter("JSON Files", "json")
        if (chooser.showSaveDialog(null) != JFileChooser.APPROVE_OPTION) return

        def file = chooser.selectedFile
        if (!file.name.endsWith(".json")) {
            file = new File(file.absolutePath + ".json")
        }

        def catalog = [
            version: "1.0.0",
            generatedAt: new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC")),
            songs: songs.collect { song ->
                // Normalizing path for Foundry VTT
                // We assume the user creates a stable path relative to the module
                // or we use the absolute path (less recommended for sharing)
                def fullPath = song.getFile().absolutePath
                
                // Heuristic: If path contains 'modules/Janus7', we trim it to module path
                def foundryPath = fullPath
                if (fullPath.contains("modules/Janus7")) {
                    foundryPath = "modules/Janus7" + fullPath.split("modules/Janus7")[1].replaceAll("\\\\", "/")
                }

                return [
                    id: "track_" + song.id,
                    path: foundryPath,
                    title: song.title,
                    artist: song.artist,
                    metadata: [
                        bpm: song.bpm as Integer,
                        mood: song.mood,
                        genre: song.genre,
                        key: song.key?.toString(),
                        color: song.color,
                        tags: (song.mood ? [song.mood.toLowerCase()] : []) + (song.genre ? [song.genre.toLowerCase()] : [])
                    ],
                    ai_scores: [
                        // Default neutral scores, user can adjust or we could map colors
                        neutral: 1.0,
                        academy_morning: mapColorToScore(song.color, "morning"),
                        dungeon: mapColorToScore(song.color, "dark")
                    ]
                ]
            }
        ]

        file.text = new JsonBuilder(catalog).toPrettyString()
        println "Janus7: Exported ${songs.length} songs to ${file.absolutePath}"
    }

    private float mapColorToScore(String color, String mood) {
        if (!color) return 0.5f
        // Simple mapping example
        if (mood == "morning" && (color.contains("yellow") || color.contains("bright"))) return 0.9f
        if (mood == "dark" && (color.contains("blue") || color.contains("dark"))) return 0.9f
        return 0.5f
    }
}
