package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.FieldDtos;
import com.example.hy_backend.exception.BadRequestException;
import com.example.hy_backend.exception.ResourceNotFoundException;
import com.example.hy_backend.model.Facility;
import com.example.hy_backend.model.FieldDefinition;
import com.example.hy_backend.model.FieldOption;
import com.example.hy_backend.model.FieldType;
import com.example.hy_backend.repository.FacilityRepository;
import com.example.hy_backend.repository.FieldDefinitionRepository;
import com.example.hy_backend.service.FieldService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class FieldServiceImpl implements FieldService {

    private final FacilityRepository facilityRepository;
    private final FieldDefinitionRepository fieldDefinitionRepository;
    private final ObjectMapper objectMapper;

    public FieldServiceImpl(
            FacilityRepository facilityRepository,
            FieldDefinitionRepository fieldDefinitionRepository,
            ObjectMapper objectMapper
    ) {
        this.facilityRepository = facilityRepository;
        this.fieldDefinitionRepository = fieldDefinitionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public FieldDtos.FieldIdResponse addField(Long facilityId, FieldDtos.AddFieldRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found with id: " + facilityId));

        FieldType parsedFieldType = parseFieldType(request.fieldType());
        validateFieldInput(
            facility,
            null,
            request.label(),
            request.displayOrder(),
            parsedFieldType,
            request.validationJson(),
            request.defaultValue()
        );

        FieldDefinition field = new FieldDefinition();
        field.setFacility(facility);
        field.setLabel(request.label().trim());
        field.setFieldType(parsedFieldType);
        field.setPlaceholder(request.placeholder());
        field.setRequired(request.required());
        field.setDisplayOrder(request.displayOrder());
        field.setValidationJson(normalizeValidationJson(request.validationJson()));
        field.setDefaultValue(normalizeDefaultValue(request.defaultValue()));

        FieldDefinition saved = fieldDefinitionRepository.save(field);
        return new FieldDtos.FieldIdResponse(saved.getFieldId());
    }

    @Override
    @Transactional
    public void addOptions(Long fieldId, FieldDtos.AddOptionsRequest request) {
        FieldDefinition field = getFieldOrThrow(fieldId);

        if (!supportsOptions(field.getFieldType())) {
            throw new BadRequestException("Options are allowed only for DROPDOWN, RADIO_BUTTON, or CHECKBOX fields");
        }

        List<String> normalizedOptions = normalizeOptions(request.options());
        if (normalizedOptions.isEmpty()) {
            throw new BadRequestException("At least one option is required");
        }

        field.getOptions().clear();
        for (int i = 0; i < normalizedOptions.size(); i++) {
            FieldOption option = new FieldOption();
            option.setField(field);
            option.setOptionValue(normalizedOptions.get(i));
            option.setDisplayOrder(i + 1);
            field.getOptions().add(option);
        }
        fieldDefinitionRepository.save(field);
    }

    @Override
    public List<FieldDtos.FieldSummaryResponse> getFields(Long facilityId) {
        return fieldDefinitionRepository.findByFacilityFacilityIdOrderByDisplayOrderAsc(facilityId).stream()
                .map(field -> new FieldDtos.FieldSummaryResponse(
                        field.getFieldId(),
                        field.getLabel(),
                        field.getFieldType().name()
                ))
                .toList();
    }

    @Override
    @Transactional
    public FieldDtos.FieldDetailResponse updateField(Long fieldId, FieldDtos.UpdateFieldRequest request) {
        FieldDefinition field = getFieldOrThrow(fieldId);
        FieldType parsedFieldType = parseFieldType(request.fieldType());

        validateFieldInput(
                field.getFacility(),
                field.getFieldId(),
                request.label(),
                request.displayOrder(),
                parsedFieldType,
                request.validationJson(),
                request.defaultValue()
        );

        field.setLabel(request.label().trim());
        field.setFieldType(parsedFieldType);
        field.setPlaceholder(request.placeholder());
        field.setRequired(request.required());
        field.setDisplayOrder(request.displayOrder());
        field.setValidationJson(normalizeValidationJson(request.validationJson()));
        field.setDefaultValue(normalizeDefaultValue(request.defaultValue()));

        if (!supportsOptions(parsedFieldType) && !field.getOptions().isEmpty()) {
            field.getOptions().clear();
        }

        FieldDefinition saved = fieldDefinitionRepository.save(field);
        return new FieldDtos.FieldDetailResponse(
                saved.getFieldId(),
                saved.getLabel(),
                saved.getFieldType().name(),
                saved.getPlaceholder(),
                saved.getRequired(),
                saved.getDisplayOrder(),
                saved.getValidationJson(),
                saved.getDefaultValue(),
                saved.getOptions().stream().map(FieldOption::getOptionValue).toList()
        );
    }

    @Override
    @Transactional
    public void deleteField(Long fieldId) {
        FieldDefinition field = getFieldOrThrow(fieldId);
        fieldDefinitionRepository.delete(field);
    }

    private FieldDefinition getFieldOrThrow(Long fieldId) {
        return fieldDefinitionRepository.findById(fieldId)
                .orElseThrow(() -> new ResourceNotFoundException("Field not found with id: " + fieldId));
    }

    private FieldType parseFieldType(String fieldType) {
        String normalized = fieldType.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        try {
            return FieldType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid fieldType: " + fieldType);
        }
    }

    private void validateFieldInput(
            Facility facility,
            Long currentFieldId,
            String label,
            Integer displayOrder,
            FieldType fieldType,
            String validationJson,
            String defaultValue
    ) {
        List<FieldDefinition> existingFields = fieldDefinitionRepository
                .findByFacilityFacilityIdOrderByDisplayOrderAsc(facility.getFacilityId());

        String normalizedLabel = label.trim().toLowerCase(Locale.ROOT);
        boolean duplicateLabel = existingFields.stream()
                .filter(field -> !field.getFieldId().equals(currentFieldId))
            .anyMatch(field -> field.getLabel().trim().equalsIgnoreCase(normalizedLabel));
        if (duplicateLabel) {
            throw new BadRequestException("Field label already exists for this facility: " + label.trim());
        }

        boolean duplicateOrder = existingFields.stream()
                .filter(field -> !field.getFieldId().equals(currentFieldId))
                .anyMatch(field -> field.getDisplayOrder().equals(displayOrder));
        if (duplicateOrder) {
            throw new BadRequestException("displayOrder already exists for this facility: " + displayOrder);
        }

        validateValidationJson(validationJson);
        validateDefaultValue(fieldType, defaultValue);
    }

    private void validateValidationJson(String validationJson) {
        if (validationJson == null || validationJson.isBlank()) {
            return;
        }

        try {
            if (!objectMapper.readTree(validationJson).isObject()) {
                throw new BadRequestException("validationJson must be a JSON object");
            }
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("validationJson must be a valid JSON object");
        }
    }

    private void validateDefaultValue(FieldType fieldType, String defaultValue) {
        if (defaultValue == null || defaultValue.isBlank()) {
            return;
        }

        String normalized = defaultValue.trim();
        try {
            switch (fieldType) {
                case NUMBER -> Double.parseDouble(normalized);
                case EMAIL -> {
                    if (!normalized.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
                        throw new BadRequestException("defaultValue is not a valid email");
                    }
                }
                case PHONE -> {
                    if (!normalized.matches("^[0-9+()\\-\\s]{7,20}$")) {
                        throw new BadRequestException("defaultValue is not a valid phone number");
                    }
                }
                default -> {
                }
            }
        } catch (NumberFormatException ex) {
            throw new BadRequestException("defaultValue is not a valid number");
        }
    }

    private boolean supportsOptions(FieldType fieldType) {
        return fieldType == FieldType.DROPDOWN || fieldType == FieldType.RADIO_BUTTON || fieldType == FieldType.CHECKBOX;
    }

    private List<String> normalizeOptions(List<String> options) {
        Set<String> unique = new LinkedHashSet<>();
        for (String option : options) {
            if (option == null) {
                continue;
            }
            String trimmed = option.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            unique.add(trimmed);
        }
        return unique.stream().toList();
    }

    private String normalizeValidationJson(String validationJson) {
        return validationJson == null || validationJson.isBlank() ? null : validationJson.trim();
    }

    private String normalizeDefaultValue(String defaultValue) {
        return defaultValue == null || defaultValue.isBlank() ? null : defaultValue.trim();
    }
}
