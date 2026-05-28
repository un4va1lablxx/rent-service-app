package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.service.FileUploadService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    private final FileUploadService fileUploadService;

    public FileUploadController(FileUploadService fileUploadService) {
        this.fileUploadService = fileUploadService;
    }

    @PostMapping("/photos")
    public ResponseEntity<List<String>> uploadPhotos(
            @RequestParam("files") List<MultipartFile> files,
            Authentication authentication) {
        List<String> urls = fileUploadService.savePhotos(files, authentication);
        return ResponseEntity.ok(urls);
    }

    @PostMapping("/file")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(Map.of("url", fileUploadService.saveMultipartFile(file)));
    }
}
