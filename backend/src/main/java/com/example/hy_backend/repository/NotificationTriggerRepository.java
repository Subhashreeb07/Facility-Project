package com.example.hy_backend.repository;

import com.example.hy_backend.model.NotificationTrigger;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationTriggerRepository extends JpaRepository<NotificationTrigger, Long> {
	boolean existsByTemplateTemplateId(Long templateId);
}
