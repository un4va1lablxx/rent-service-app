package edu.belsu.rent_service.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.StandardOpenOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FileUploadService {

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public List<String> savePhotos(List<MultipartFile> files, Authentication authentication) {
        List<String> urls = new ArrayList<>();

        try {
            Path uploadPath = getUploadPath();

            for (MultipartFile file : files) {
                String filename = generateSafeFilename(file.getOriginalFilename(), file.getContentType());
                Path filePath = uploadPath.resolve(filename);

                file.transferTo(filePath.toFile());

                urls.add(buildPublicUrl(filename));
            }
        } catch (IOException e) {
            throw new RuntimeException("Ошибка при сохранении файлов: " + e.getMessage(), e);
        }

        return urls;
    }

    public String savePhotoFromStream(InputStream inputStream, String filename) {
        try {
            Path uploadPath = getUploadPath();

            String safeFilename = sanitizeFilename(filename);
            Path filePath = uploadPath.resolve(safeFilename);

            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);

            return buildPublicUrl(safeFilename);
        } catch (IOException e) {
            throw new RuntimeException("Ошибка сохранения фото из Telegram", e);
        }
    }

    public String saveMultipartFile(MultipartFile file) {
        try {
            Path uploadPath = getUploadPath();

            String filename = generateSafeFilename(file.getOriginalFilename(), file.getContentType());
            Path filePath = uploadPath.resolve(filename);

            file.transferTo(filePath.toFile());

            return buildPublicUrl(filename);
        } catch (IOException e) {
            throw new RuntimeException("Ошибка при сохранении файла", e);
        }
    }

    public String saveFile(byte[] bytes, String filename) {
        try {
            Path uploadPath = getUploadPath();

            String safeFilename = sanitizeFilename(filename);
            Path filePath = uploadPath.resolve(safeFilename);

            Files.write(
                    filePath,
                    bytes,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING
            );

            return buildPublicUrl(safeFilename);
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

    private String buildPublicUrl(String filename) {
        String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();

        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }

        return base + "/uploads/" + filename;
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
            default -> "";
        };
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return UUID.randomUUID().toString();
        }

        return Paths.get(filename).getFileName().toString();
    }
}
