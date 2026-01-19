use lofty::file::AudioFile;
use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use lofty::picture::PictureType;
use lofty::tag::Accessor;
use base64::Engine;
use std::path::Path;
use std::borrow::Cow;

#[derive(Debug, serde::Serialize)]
pub struct AudioMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub year: Option<u32>,
    pub track: Option<u32>,
    pub genre: Option<String>,
    pub duration: Option<f64>,
    pub cover_art: Option<CoverArt>,
}

#[derive(Debug, serde::Serialize)]
pub struct CoverArt {
    pub format: String,
    pub data: Vec<u8>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

pub fn extract_audio_metadata(file_path: &str) -> Result<AudioMetadata, String> {
    let path = Path::new(file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    // Probe the audio file
    let probe = Probe::open(path)
        .map_err(|e| format!("Failed to open audio file: {}", e))?
        .read()
        .map_err(|e| format!("Failed to read audio file: {}", e))?;

    let mut metadata = AudioMetadata {
        title: None,
        artist: None,
        album: None,
        year: None,
        track: None,
        genre: None,
        duration: None,
        cover_art: None,
    };

    // Extract basic properties
    let properties = probe.properties();
    metadata.duration = Some(properties.duration().as_secs_f64());

    // Extract tag information - try multiple tag sources
    if let Some(tag) = probe.primary_tag() {
        metadata.title = tag.title().map(|s: Cow<str>| s.to_string());
        metadata.artist = tag.artist().map(|s: Cow<str>| s.to_string());
        metadata.album = tag.album().map(|s: Cow<str>| s.to_string());
        metadata.genre = tag.genre().map(|s: Cow<str>| s.to_string());
        metadata.year = tag.year();
        metadata.track = tag.track();
    }

    // Also try secondary tags for better compatibility
    for tag in probe.tags() {
        if metadata.title.is_none() {
            metadata.title = tag.title().map(|s: Cow<str>| s.to_string());
        }
        if metadata.artist.is_none() {
            metadata.artist = tag.artist().map(|s: Cow<str>| s.to_string());
        }
        if metadata.album.is_none() {
            metadata.album = tag.album().map(|s: Cow<str>| s.to_string());
        }
    }

    // Extract cover art from all tags
    for tag in probe.tags() {
        for picture in tag.pictures() {
            // Accept both CoverFront and Other types for better compatibility
            if picture.pic_type() == PictureType::CoverFront || 
               picture.pic_type() == PictureType::Other {
                let format = match picture.mime_type() {
                    Some(mime) => match mime.as_str() {
                        "image/jpeg" => "jpeg".to_string(),
                        "image/png" => "png".to_string(),
                        "image/webp" => "webp".to_string(),
                        _ => "jpeg".to_string(),
                    },
                    None => "jpeg".to_string(),
                };

                metadata.cover_art = Some(CoverArt {
                    format,
                    data: picture.data().to_vec(),
                    width: None,
                    height: None,
                });
                break;
            }
        }
        if metadata.cover_art.is_some() {
            break;
        }
    }

    Ok(metadata)
}

#[tauri::command]
pub fn get_audio_cover_art(filePath: String) -> Result<Option<String>, String> {
    match extract_audio_metadata(&filePath) {
        Ok(metadata) => {
            if let Some(cover_art) = metadata.cover_art {
                // Convert to base64 for frontend consumption
                let engine = base64::engine::general_purpose::STANDARD;
                let base64_data = engine.encode(&cover_art.data);
                let mime_type = match cover_art.format.as_str() {
                    "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    _ => "image/jpeg", // Default to jpeg
                };
                Ok(Some(format!("data:{};base64,{}", mime_type, base64_data)))
            } else {
                Ok(None)
            }
        }
        Err(e) => Err(format!("Failed to extract audio metadata: {}", e)),
    }
}

#[tauri::command]
pub fn get_audio_metadata(filePath: String) -> Result<AudioMetadata, String> {
    extract_audio_metadata(&filePath)
}
