package com.financeapp;

import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import com.financeapp.service.TransactionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class BackendApplicationTests {

	@Autowired
	private TransactionService transactionService;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private TransactionRepository transactionRepository;

	@Test
	void testClearTransactions() {
		String email = "test_clear@example.com";
		userRepository.findByEmail(email).ifPresent(user -> {
			transactionRepository.deleteByUser(user);
			userRepository.delete(user);
		});

		User user = User.builder()
				.name("Test User")
				.email(email)
				.password("password")
				.build();
		user = userRepository.save(user);

		Transaction transaction = Transaction.builder()
				.title("Test Transaction")
				.amount(100.0)
				.category("Test")
				.date(LocalDate.now())
				.user(user)
				.build();
		transactionRepository.save(transaction);

		assertEquals(1, transactionRepository.findByUser(user).size());

		transactionService.clearTransactions(email);

		assertEquals(0, transactionRepository.findByUser(user).size());

		userRepository.delete(user);
	}

}

