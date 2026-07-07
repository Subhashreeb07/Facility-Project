package com.example.hy_backend.controller;

import com.example.hy_backend.model.Facility;
import com.example.hy_backend.model.FieldDefinition;
import com.example.hy_backend.model.FieldOption;
import com.example.hy_backend.model.FieldType;
import com.example.hy_backend.repository.FacilityRepository;
import com.example.hy_backend.repository.FieldDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class FacilityControllerSpecificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FacilityRepository facilityRepository;

    @Autowired
    private FieldDefinitionRepository fieldDefinitionRepository;

    @Test
    void getSpecification_shouldReturnFieldOptions_withoutLazyInitializationFailure() throws Exception {
        Facility facility = new Facility();
        facility.setFacilityName("Controller Spec " + UUID.randomUUID());
        facility.setDescription("controller integration");
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

        mockMvc.perform(get("/api/facilities/{facilityId}/specification", savedFacility.getFacilityId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.facilityId").value(savedFacility.getFacilityId()))
                .andExpect(jsonPath("$.facilityName").value(savedFacility.getFacilityName()))
                .andExpect(jsonPath("$.fields[0].label").value("Purpose"))
                .andExpect(jsonPath("$.fields[0].type").value("DROPDOWN"))
                .andExpect(jsonPath("$.fields[0].options[0]").value("Office"))
                .andExpect(jsonPath("$.fields[0].options[1]").value("Client Visit"));
    }
}
