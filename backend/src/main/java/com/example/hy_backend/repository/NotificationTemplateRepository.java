package com.example.hy_backend.repository;

import com.example.hy_backend.model.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, Long> {
    boolean existsByTemplateNameIgnoreCaseAndTemplateIdNot(String templateName, Long templateId);

    boolean existsByTemplateNameIgnoreCase(String templateName);
}
