package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.EmployeeDtos;
import com.example.hy_backend.dto.FacilityDtos;
import com.example.hy_backend.model.Facility;
import com.example.hy_backend.model.FieldDefinition;
import com.example.hy_backend.model.FieldOption;
import com.example.hy_backend.model.FieldType;
import com.example.hy_backend.repository.FacilityRepository;
import com.example.hy_backend.repository.FieldDefinitionRepository;
import com.example.hy_backend.service.FacilityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class FacilityServiceImplIntegrationTest {

    @Autowired
    private FacilityService facilityService;

    @Autowired
    private FacilityRepository facilityRepository;

    @Autowired
    private FieldDefinitionRepository fieldDefinitionRepository;

    @Test
    void getFacilitySpecification_shouldIncludeOptions_withoutLazyInitializationFailure() {
        Facility facility = new Facility();
        facility.setFacilityName("Spec Integration " + UUID.randomUUID());
        facility.setDescription("dynamic");
        facility.setCategory("General");
        facility.setIcon("inventory_2");
        facility.setStatus(true);
        facility.setPublished(true);
        Facility savedFacility = facilityRepository.save(facility);

        FieldDefinition field = new FieldDefinition();
        field.setFacility(savedFacility);
        field.setLabel("Purpose");
        field.setFieldType(FieldType.DROPDOWN);
        field.setRequired(true);
        field.setDisplayOrder(1);

        FieldOption option1 = new FieldOption();
        option1.setField(field);
        option1.setOptionValue("Office");
        option1.setDisplayOrder(1);

        FieldOption option2 = new FieldOption();
        option2.setField(field);
        option2.setOptionValue("Client Visit");
        option2.setDisplayOrder(2);

        field.setOptions(List.of(option1, option2));
        fieldDefinitionRepository.save(field);

        EmployeeDtos.FacilitySpecificationResponse specification = facilityService.getFacilitySpecification(savedFacility.getFacilityId());

        assertNotNull(specification);
        assertEquals(savedFacility.getFacilityId(), specification.facilityId());
        assertEquals(1, specification.fields().size());
        assertEquals("Purpose", specification.fields().get(0).label());
        assertEquals(List.of("Office", "Client Visit"), specification.fields().get(0).options());
    }

    @Test
    void publishFacility_shouldSucceed_whenOptionBasedFieldsHaveOptions() {
        FacilityDtos.FacilityCreateResponse created = facilityService.createFacility(
                new FacilityDtos.FacilityCreateRequest(
                        "Publish Integration " + UUID.randomUUID(),
                        "publish test",
                        "General",
                        "inventory_2",
                        true
                )
        );

        FieldDefinition field = new FieldDefinition();
        field.setFacility(facilityRepository.findById(created.facilityId()).orElseThrow());
        field.setLabel("Travel Mode");
        field.setFieldType(FieldType.DROPDOWN);
        field.setRequired(true);
        field.setDisplayOrder(1);

        FieldOption option = new FieldOption();
        option.setField(field);
        option.setOptionValue("Cab");
        option.setDisplayOrder(1);
        field.setOptions(List.of(option));

        fieldDefinitionRepository.save(field);

        FacilityDtos.PublishResponse publishResponse = facilityService.publishFacility(
            created.facilityId(),
            new FacilityDtos.PublishRequest(List.of("HYDERABAD", "KOLKATA"))
        );

        assertEquals(created.facilityId(), publishResponse.facilityId());
        assertTrue(facilityRepository.findById(created.facilityId()).orElseThrow().getPublished());
        assertFalse(facilityRepository.findById(created.facilityId()).orElseThrow().getFacilityName().isBlank());
    }

    @Test
    void publishFacility_shouldEnableStatus_whenFacilityWasDisabled() {
        FacilityDtos.FacilityCreateResponse created = facilityService.createFacility(
                new FacilityDtos.FacilityCreateRequest(
                        "Publish Status Integration " + UUID.randomUUID(),
                        "publish status test",
                        "General",
                        "inventory_2",
                        false
                )
        );

        FieldDefinition field = new FieldDefinition();
        field.setFacility(facilityRepository.findById(created.facilityId()).orElseThrow());
        field.setLabel("Travel Purpose");
        field.setFieldType(FieldType.DROPDOWN);
        field.setRequired(true);
        field.setDisplayOrder(1);

        FieldOption option = new FieldOption();
        option.setField(field);
        option.setOptionValue("Office");
        option.setDisplayOrder(1);
        field.setOptions(List.of(option));

        fieldDefinitionRepository.save(field);
        facilityService.publishFacility(
            created.facilityId(),
            new FacilityDtos.PublishRequest(List.of("HYDERABAD"))
        );

        Facility updated = facilityRepository.findById(created.facilityId()).orElseThrow();
        assertTrue(updated.getPublished());
        assertTrue(updated.getStatus());
    }
}
