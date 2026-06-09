package edu.belsu.rent_service.adapters.in.web.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

@RestController
public class UploadResourceController {

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @GetMapping("/uploads/{filename}")
    public ResponseEntity<Resource> getUpload(@PathVariable String filename) {
        Path uploadPath = resolveUploadPath();
        Path requestedPath = uploadPath.resolve(Paths.get(filename).getFileName()).normalize();

        if (!requestedPath.startsWith(uploadPath) || !Files.isRegularFile(requestedPath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new PathResource(requestedPath);
        MediaType mediaType = MediaTypeFactory.getMediaType(resource)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .body(resource);
    }

    private Path resolveUploadPath() {
        Path path = Paths.get(uploadDir);

        if (!path.isAbsolute()) {
            path = Paths.get(System.getProperty("user.dir")).resolve(uploadDir);
        }

        return path.normalize();
    }
}
