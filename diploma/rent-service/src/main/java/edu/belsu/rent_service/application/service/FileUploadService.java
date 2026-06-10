package edu.belsu.rent_service.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class FileUploadService {

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${cloudinary.cloud-name:}")
    private String cloudinaryCloudName;

    @Value("${cloudinary.api-key:}")
    private String cloudinaryApiKey;

    @Value("${cloudinary.api-secret:}")
    private String cloudinaryApiSecret;

    @Value("${cloudinary.folder:rent-service}")
    private String cloudinaryFolder;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<String> savePhotos(List<MultipartFile> files, Authentication authentication) {
        List<String> urls = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                String filename = generateSafeFilename(file.getOriginalFilename(), file.getContentType());
                urls.add(saveBytes(file.getBytes(), filename, file.getContentType()));
            } catch (IOException e) {
                throw new RuntimeException("Ошибка при сохранении файлов: " + e.getMessage(), e);
            }
        }

        return urls;
    }

    public String savePhotoFromStream(InputStream inputStream, String filename) {
        try {
            String safeFilename = sanitizeFilename(filename);
            return saveBytes(inputStream.readAllBytes(), safeFilename, contentTypeFromFilename(safeFilename));
        } catch (IOException e) {
            throw new RuntimeException("Ошибка сохранения фото из Telegram", e);
        }
    }

    public String saveMultipartFile(MultipartFile file) {
        try {
            String filename = generateSafeFilename(file.getOriginalFilename(), file.getContentType());
            return saveBytes(file.getBytes(), filename, file.getContentType());
        } catch (IOException e) {
            throw new RuntimeException("Ошибка при сохранении файла", e);
        }
    }

    public String saveFile(byte[] bytes, String filename) {
        String safeFilename = sanitizeFilename(filename);
        return saveBytes(bytes, safeFilename, contentTypeFromFilename(safeFilename));
    }

    private String saveBytes(byte[] bytes, String filename, String contentType) {
        if (isCloudinaryConfigured()) {
            return uploadToCloudinary(bytes, filename, contentType);
        }
        return saveToLocalDisk(bytes, filename);
    }

    private String uploadToCloudinary(byte[] bytes, String filename, String contentType) {
        try {
            long timestamp = System.currentTimeMillis() / 1000;
            String publicId = buildCloudinaryPublicId(filename);
            String signature = signCloudinaryUpload(publicId, timestamp);
            String uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudinaryCloudName.trim() + "/auto/upload";

            RequestBody fileBody = RequestBody.create(
                    bytes,
                    MediaType.parse(contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType)
            );

            RequestBody requestBody = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", filename, fileBody)
                    .addFormDataPart("api_key", cloudinaryApiKey.trim())
                    .addFormDataPart("timestamp", String.valueOf(timestamp))
                    .addFormDataPart("public_id", publicId)
                    .addFormDataPart("signature", signature)
                    .build();

            Request request = new Request.Builder()
                    .url(uploadUrl)
                    .post(requestBody)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String responseBody = response.body() == null ? "" : response.body().string();
                if (!response.isSuccessful()) {
                    throw new RuntimeException("Cloudinary upload failed: HTTP " + response.code() + " " + responseBody);
                }

                JsonNode json = objectMapper.readTree(responseBody);
                String secureUrl = json.path("secure_url").asText("");
                if (secureUrl.isBlank()) {
                    throw new RuntimeException("Cloudinary upload response does not contain secure_url");
                }
                return secureUrl;
            }
        } catch (IOException e) {
            throw new RuntimeException("Ошибка загрузки файла в Cloudinary", e);
        }
    }

    private String saveToLocalDisk(byte[] bytes, String filename) {
        try {
            Path uploadPath = getUploadPath();
            Path filePath = uploadPath.resolve(filename);

            Files.write(
                    filePath,
                    bytes,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING
            );

            return "/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Ошибка сохранения файла", e);
        }
    }

    private Path getUploadPath() throws IOException {
        Path path = Paths.get(uploadDir);

        if (!path.isAbsolute()) {
            path = Paths.get(System.getProperty("user.dir")).resolve(uploadDir);
        }

        path = path.normalize();

        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }

        return path;
    }

    private boolean isCloudinaryConfigured() {
        return hasText(cloudinaryCloudName) && hasText(cloudinaryApiKey) && hasText(cloudinaryApiSecret);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String buildCloudinaryPublicId(String filename) {
        String safeFilename = sanitizeFilename(filename);
        int dotIndex = safeFilename.lastIndexOf('.');
        String withoutExtension = dotIndex > 0 ? safeFilename.substring(0, dotIndex) : safeFilename;
        String safeFolder = cloudinaryFolder == null ? "rent-service" : cloudinaryFolder.trim();
        if (safeFolder.isBlank()) {
            return withoutExtension;
        }
        return safeFolder.replaceAll("^/+|/+$", "") + "/" + withoutExtension;
    }

    private String signCloudinaryUpload(String publicId, long timestamp) {
        String payload = "public_id=" + publicId + "&timestamp=" + timestamp + cloudinaryApiSecret.trim();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Ошибка подписи Cloudinary upload", e);
        }
    }

    private String generateSafeFilename(String originalFilename, String contentType) {
        String extension = "";

        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        if (extension.isBlank()) {
            extension = extensionFromContentType(contentType);
        }

        return UUID.randomUUID() + extension;
    }

    private String extensionFromContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        return switch (contentType.toLowerCase()) {
            case "image/jpeg", "image/jpg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            default -> "";
        };
    }

    private String contentTypeFromFilename(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return "application/octet-stream";
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return UUID.randomUUID().toString();
        }

        return Paths.get(filename).getFileName().toString();
    }
}
