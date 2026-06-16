# Chapter 5: Monetary Accounts

## Overview

bunq Monetary Accounts are the core financial containers within the bunq banking ecosystem. They serve as digital accounts that hold funds, facilitate transactions, and provide the fundamental infrastructure for all banking operations. Each monetary account functions as an independent financial entity with its own balance, transaction history, and security settings.

## Core Concepts

### What is a Monetary Account?

A monetary account is bunq's digital representation of a bank account. It contains essential banking information including balance tracking, transaction management, and access control. Every monetary account has a unique identifier (publicUuid), display name, currency, and status that determines its operational state.

### Account Types

bunq supports multiple types of monetary accounts, each designed for specific use cases:

* **MonetaryAccountBank**: Standard checking/current accounts for daily banking operations with overdraft capabilities
* **MonetaryAccountSavings**: Interest-bearing savings accounts with specific terms and conditions
* **MonetaryAccountJoint**: Shared accounts with multiple account holders and access permissions
* **MonetaryAccountExternal**: Accounts for external payment providers integration

### Key Properties

Every monetary account contains:

* `publicUuid`: Unique identifier for external references and API operations
* `alias`: Contains information regarding the IBAN
* `displayName`: Human-readable account name chosen by the user
* `currency`: Three-letter ISO currency code (EUR, USD, etc.)
* `description`: Optional account description for user reference
* `dailyLimit`: Maximum daily spending/transfer limit
* `transactionLimit`: Per-transaction limit (optional)
* `status`: Current operational status (ACTIVE, BLOCKED, CANCELLED, etc.)
* `subStatus`: Additional status information for specialized account states
* `country`: Account's registered country for regulatory compliance

### Status Types

Monetary accounts operate under a comprehensive status system:

* `ACTIVE`: Account is fully operational for all transactions
* `BLOCKED`: Account access is restricted, typically for security reasons
* `CANCELLED`: Account is permanently closed and cannot be reactivated
* `PENDING_REOPEN`: Account closure has been requested but is awaiting final processing
* `PENDING_ACCEPTANCE`: New account awaiting activation or approval
* `PENDING_CLOSURE`: Account closure process is in progress
* `FROZEN`: Account is temporarily suspended due to regulatory or compliance requirements

### Sub-Status Details

Additional granular control through sub-statuses:

* `NONE`: No additional restrictions apply
* `ONLY_ACCEPTING_INCOMING`: Account can only receive payments, not send them
* `COMPLETELY`: Complete restriction of all operations
* `REDEMPTION_INVOLUNTARY`: Account closure mandated by bank or authorities
* `REDEMPTION_VOLUNTARY`: User-initiated account closure
* `PERMANENT`: Permanent restriction that cannot be reversed

## Balance Management

### Balance Types

bunq tracks multiple balance types for comprehensive financial management:

* Real Balance: Actual available funds in the account
* Available Balance: Funds available for spending (includes overdraft limits)

### Balance Calculation

The system continuously calculates and updates balances based on:

* Incoming and outgoing transactions
* Pending payments and holds
* Overdraft limits and credit facilities
* Interest accruals and fees

## Access Control

### User Access

Monetary accounts support sophisticated access control mechanisms:

* Owner Access: Full control over account settings, transactions, and management
* Co-owner Access: Shared control with specific permission levels
* View Access: Read-only access to account information and transaction history

## Transaction Processing

### Payment Methods

Monetary accounts support various payment methods:

* SEPA Transfers: European payment processing for EUR transactions
* International Transfers: Cross-border payments through integrated payment processors
* Card Payments: Mastercard and other card network transactions
* Digital Payments: bunq.me, bunq.to, and other digital payment methods
* Direct Debits: Automated recurring payment processing

### Transaction Limits

Multiple layers of transaction control:

* Daily Limits: Maximum daily transaction amounts
* Transaction Limits: Per-transaction maximum amounts

