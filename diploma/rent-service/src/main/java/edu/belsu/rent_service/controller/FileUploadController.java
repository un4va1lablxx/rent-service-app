package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.service.FileUploadService;
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
}