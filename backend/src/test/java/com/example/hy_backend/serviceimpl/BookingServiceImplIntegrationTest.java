package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.BookingDtos;
import com.example.hy_backend.model.Facility;
import com.example.hy_backend.model.FieldDefinition;
import com.example.hy_backend.model.FieldOption;
import com.example.hy_backend.model.FieldType;
import com.example.hy_backend.repository.FacilityRepository;
import com.example.hy_backend.repository.FieldDefinitionRepository;
import com.example.hy_backend.service.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class BookingServiceImplIntegrationTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private FacilityRepository facilityRepository;

    @Autowired
    private FieldDefinitionRepository fieldDefinitionRepository;

    @Test
    void submitBooking_shouldValidateDropdownOption_withoutLazyInitializationFailure() {
        Facility facility = new Facility();
        facility.setFacilityName("Booking Integration " + UUID.randomUUID());
        facility.setDescription("booking integration");
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

        FieldOption option = new FieldOption();
        option.setField(field);
        option.setOptionValue("Office");
        option.setDisplayOrder(1);
        field.setOptions(List.of(option));
        FieldDefinition savedField = fieldDefinitionRepository.save(field);

        BookingDtos.SubmitBookingRequest request = new BookingDtos.SubmitBookingRequest(
                savedFacility.getFacilityId(),
                "EMP001",
                null,
                LocalDate.now().toString(),
                List.of(new BookingDtos.BookingFieldInput(savedField.getFieldId(), "Office"))
        );

        BookingDtos.SubmitBookingResponse response = bookingService.submitBooking(request);

        assertNotNull(response.bookingId());
        assertEquals("CONFIRMED", response.status());
    }
}
