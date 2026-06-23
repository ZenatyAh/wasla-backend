# Wasla Search & Filtering Integration Guide

This guide provides frontend developers with the specifications, payloads, response shapes, and best practices for integrating the **Post Search** and **User Search** systems in the Wasla application.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Post Search API (`POST /posts/search`)](#3-post-search-api-postpostssearch)
   - [Request Body Parameters](#request-body-parameters)
   - [Post Filters Schema](#post-filters-schema)
   - [Request Example](#request-example)
   - [Response Shape & Mapping](#response-shape--mapping)
4. [User Search API (`POST /users/search`)](#4-user-search-api-postuserssearch)
   - [Request Body Parameters](#request-body-parameters-1)
   - [User Filters Schema](#user-filters-schema)
   - [Request Example](#request-example-1)
   - [Response Shape & Mapping](#response-shape--mapping-1)
5. [Frontend Integration Examples](#5-frontend-integration-examples)
   - [TypeScript API Client Example](#typescript-api-client-example)
   - [React State Management Pattern](#react-state-management-pattern)

---

## 1. Overview

Wasla features two distinct search endpoints:
1. **Post Search**: Uses a hybrid system. If the AI Recommender is enabled and available, it runs semantic vector searches and applies filters on the retrieved posts (re-sorting to preserve relevancy rank). Otherwise, it falls back to a database text-search system matching title and description with filter clauses.
2. **User Search**: Queries the PostgreSQL database directly, using keyword matching on name and bio, and applying specific filters to find service providers or requesters.

---

## 2. Authentication

Both search endpoints require authentication. Include the user's JWT access token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_access_token>
```

---

## 3. Post Search API (`POST /posts/search`)

### Request Body Parameters

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `query` | `string` | **Yes** | - | The search text (e.g. `"سباكة"`, `"تطوير ويب"`). Must be between 1 and 500 characters. |
| `topK` | `number` | No | `20` | Maximum number of results to return. Must be between 1 and 50. |
| `threshold` | `number` | No | - | Minimum semantic similarity threshold (between `0` and `1`). Only applicable when recommender is active. |
| `filters` | `object` | No | - | Optional filters to narrow search results. |

### Post Filters Schema

The `filters` object accepts the following fields:

| Filter Field | Type | Description |
| :--- | :--- | :--- |
| `category` | `"OFFER"` or `"REQUEST"` | Filters posts by their category (e.g., offers of help vs. requests for service). |
| `serviceMode` | `"ONLINE"` or `"OFFLINE"` | Filters posts by service delivery mode. |
| `minCredits` | `number` (integer) | Minimum time credits assigned to the post. |
| `maxCredits` | `number` (integer) | Maximum time credits assigned to the post. |
| `location` | `string` | Filters posts based on the post creator's location (case-insensitive partial match, e.g. `"القاهرة"`). |

### Request Example

```json
{
  "query": "اصلاح اعطال السباكة",
  "topK": 10,
  "filters": {
    "category": "OFFER",
    "serviceMode": "ONLINE",
    "minCredits": 2,
    "maxCredits": 8,
    "location": "القاهرة"
  }
}
```

### Response Shape & Mapping

The backend returns a standard response wrapper:
- **`source`**: Identifies whether the results came from the AI semantic search (`"recommender"`) or Postgres fallback (`"fallback"`).
- **`results`**: An array of hydrated posts (represented in `camelCase`) along with recommender similarity scores if sourced via the recommender.

#### Response Example
```json
{
  "query": "اصلاح اعطال السباكة",
  "count": 1,
  "source": "recommender",
  "results": [
    {
      "post": {
        "id": 142,
        "userId": 55,
        "title": "خدمة سباكة منزلية",
        "description": "اصلاح تسريبات المياه وصيانة المحابس والسباكة الخارجية والداخلية بأعلى جودة.",
        "category": "OFFER",
        "serviceMode": "ONLINE",
        "assignedTimeCredits": 5,
        "status": "PUBLISHED",
        "createdAt": "2026-06-23T19:16:54.648Z",
        "updatedAt": "2026-06-23T19:16:54.648Z",
        "user": {
          "id": 55,
          "full_name": "أحمد علي",
          "username": "ahmed_ali",
          "location": "القاهرة",
          "is_online": true,
          "is_verified": true
        }
      },
      "scores": {
        "similarityScore": 0.92,
        "finalScore": 0.89
      }
    }
  ]
}
```

> [!NOTE]
> If the search path falls back to the database (`source === "fallback"`), the `scores` object inside each result item will be `null`. Ensure your frontend UI handles both states gracefully (e.g., displaying relevance badges only when scores are available).

---

## 4. User Search API (`POST /users/search`)

This endpoint searches the database for users based on keywords in their names or profiles, filtered by their characteristics and capabilities.

### Request Body Parameters

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `query` | `string` | **Yes** | - | Keyword query to search in user names and bios. Must be between 1 and 500 characters. |
| `topK` | `number` | No | `20` | Max results to return. Must be between 1 and 50. |
| `filters` | `object` | No | - | Optional filters to narrow search results. |

### User Filters Schema

The `filters` object accepts the following fields:

| Filter Field | Type | Description |
| :--- | :--- | :--- |
| `skillType` | `"OFFER"` or `"REQUEST"` | Filters users who have explicitly registered skills of this type (e.g., users offering specific skills). |
| `location` | `string` | Filters users by their configured location (case-insensitive partial match). |
| `isOnline` | `boolean` | Filters users who are currently active (connected to chat websockets). |
| `isVerified` | `boolean` | Filters users who have completed identity verification. |

### Request Example

```json
{
  "query": "مطور ويب",
  "topK": 15,
  "filters": {
    "skillType": "OFFER",
    "location": "الإسكندرية",
    "isOnline": true,
    "isVerified": true
  }
}
```

### Response Shape & Mapping

#### Response Example
```json
{
  "query": "مطور ويب",
  "count": 1,
  "source": "database",
  "results": [
    {
      "user": {
        "id": 99,
        "fullName": "محمد محمود",
        "username": "mohammed_dev",
        "location": "الإسكندرية",
        "bio": "مطور ويب خبير في React و Node.js",
        "isOnline": true,
        "isVerified": true,
        "createdAt": "2026-05-12T10:00:00.000Z",
        "updatedAt": "2026-06-20T12:00:00.000Z"
      }
    }
  ]
}
```

> [!IMPORTANT]
> The search response strips out sensitive user properties (such as `email`, `password_hash`, and notifications options) for privacy and security.

---

## 5. Frontend Integration Examples

### TypeScript API Client Example

Here is a clean implementation of the search requests using native `fetch` or `axios` wrapper:

```typescript
export interface SearchPostFilters {
  category?: 'OFFER' | 'REQUEST';
  serviceMode?: 'ONLINE' | 'OFFLINE';
  minCredits?: number;
  maxCredits?: number;
  location?: string;
}

export interface SearchPostsPayload {
  query: string;
  topK?: number;
  threshold?: number;
  filters?: SearchPostFilters;
}

export interface SearchUserFilters {
  skillType?: 'OFFER' | 'REQUEST';
  location?: string;
  isOnline?: boolean;
  isVerified?: boolean;
}

export interface SearchUsersPayload {
  query: string;
  topK?: number;
  filters?: SearchUserFilters;
}

class WaslaApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  async searchPosts(payload: SearchPostsPayload) {
    const response = await fetch(`${this.baseUrl}/posts/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to search posts');
    }

    return response.json();
  }

  async searchUsers(payload: SearchUsersPayload) {
    const response = await fetch(`${this.baseUrl}/users/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to search users');
    }

    return response.json();
  }
}
```

### React State Management Pattern

When building a UI filter panel, bind each input parameter to state, and only send fields when they are active:

```tsx
import React, { useState } from 'react';

export const SearchFilterPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'OFFER' | 'REQUEST' | ''>('');
  const [serviceMode, setServiceMode] = useState<'ONLINE' | 'OFFLINE' | ''>('');
  const [minCredits, setMinCredits] = useState<number | ''>('');
  const [maxCredits, setMaxCredits] = useState<number | ''>('');
  const [location, setLocation] = useState('');

  const handleSearch = async () => {
    // Construct filters dynamically to avoid sending empty strings or empty bounds
    const filters: any = {};
    if (category) filters.category = category;
    if (serviceMode) filters.serviceMode = serviceMode;
    if (minCredits !== '') filters.minCredits = Number(minCredits);
    if (maxCredits !== '') filters.maxCredits = Number(maxCredits);
    if (location.trim()) filters.location = location.trim();

    const payload = {
      query: query.trim(),
      topK: 20,
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
    };

    try {
      // Call your API client...
      console.log('Sending search query:', payload);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="filter-panel">
      {/* Search Input */}
      <input 
        type="text" 
        placeholder="ابحث هنا..." 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
      />

      {/* Category Filter */}
      <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
        <option value="">كل الفئات</option>
        <option value="OFFER">عرض خدمة</option>
        <option value="REQUEST">طلب خدمة</option>
      </select>

      {/* Service Mode Filter */}
      <select value={serviceMode} onChange={(e) => setServiceMode(e.target.value as any)}>
        <option value="">كل أوضاع الخدمة</option>
        <option value="ONLINE">عن بعد</option>
        <option value="OFFLINE">حضورياً</option>
      </select>

      {/* Credits Filters */}
      <input 
        type="number" 
        placeholder="الحد الأدنى للنقاط" 
        value={minCredits} 
        onChange={(e) => setMinCredits(e.target.value === '' ? '' : Number(e.target.value))} 
      />
      <input 
        type="number" 
        placeholder="الحد الأقصى للنقاط" 
        value={maxCredits} 
        onChange={(e) => setMaxCredits(e.target.value === '' ? '' : Number(e.target.value))} 
      />

      {/* Location Filter */}
      <input 
        type="text" 
        placeholder="الموقع الجغرافي" 
        value={location} 
        onChange={(e) => setLocation(e.target.value)} 
      />

      <button onClick={handleSearch}>بحث</button>
    </div>
  );
};
```
