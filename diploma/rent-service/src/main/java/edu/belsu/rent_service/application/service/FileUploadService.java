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

    public List<String> savePhotos(List<MultipartFile> files, Authentication authentication) {
        List<String> urls = new ArrayList<>();

        try {
            // Получаем абсолютный путь к директории проекта
            String basePath = System.getProperty("user.dir");
            Path uploadPath = Paths.get(basePath, uploadDir);

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                System.out.println("📁 Создана папка для загрузки: " + uploadPath.toAbsolutePath());
            }

            for (MultipartFile file : files) {
                String originalFilename = file.getOriginalFilename();
                String extension = "";
                if (originalFilename != null && originalFilename.contains(".")) {
                    extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                }
                String filename = UUID.randomUUID().toString() + extension;
                Path filePath = uploadPath.resolve(filename);
                file.transferTo(filePath.toFile());

                String url = "http://localhost:8080/uploads/" + filename;
                urls.add(url);
                System.out.println("✅ Файл сохранён: " + filePath.toAbsolutePath());
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Ошибка при сохранении файлов: " + e.getMessage(), e);
        }

        return urls;
    }

    public String savePhotoFromStream(InputStream inputStream, String filename) {
        try {
            String basePath = System.getProperty("user.dir");
            Path uploadPath = Paths.get(basePath, "./uploads");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path filePath = uploadPath.resolve(filename);
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);

            return "http://localhost:8080/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Ошибка сохранения фото из Telegram", e);
        }
    }

    public String saveMultipartFile(MultipartFile file) {
        try {
            String basePath = System.getProperty("user.dir");
            Path uploadPath = Paths.get(basePath, "./uploads");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID() + extension;
            Path filePath = uploadPath.resolve(filename);
            file.transferTo(filePath.toFile());
            return "http://localhost:8080/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Ошибка при сохранении файла", e);
        }
    }

    public String saveFile(byte[] bytes, String filename) {
        try {
            String basePath = System.getProperty("user.dir");
            Path uploadPath = Paths.get(basePath, "./uploads");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path filePath = uploadPath.resolve(filename);
            Files.write(filePath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return "http://localhost:8080/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Ошибка сохранения файла", e);
        }
    }
}
