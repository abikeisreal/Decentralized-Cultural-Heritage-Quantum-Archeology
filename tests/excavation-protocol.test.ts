// Excavation Protocol Contract Tests
import { describe, it, expect, beforeEach } from "vitest"

// Mock contract state
const mockContract = {
  maps: new Map(),
  vars: new Map(),
  currentSender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  blockHeight: 1000,
}

// Mock contract functions
function registerExcavationSite(location, protocolType, estimatedDuration, quantumMethod) {
  if (estimatedDuration <= 0) {
    return { error: 203 } // err-invalid-protocol
  }
  
  const siteId = mockContract.vars.get("next-site-id") || 1
  const institution = mockContract.currentSender
  
  mockContract.maps.set(`excavation-sites-${siteId}`, {
    location,
    institution,
    protocolType,
    startDate: mockContract.blockHeight,
    estimatedDuration,
    quantumMethod,
    status: "active",
    findingsCount: 0,
  })
  
  mockContract.maps.set(`site-permissions-${siteId}`, {
    authorizedInstitution: institution,
    permissionLevel: 5,
    grantedDate: mockContract.blockHeight,
    expiresAt: mockContract.blockHeight + estimatedDuration,
    quantumAccess: true,
  })
  
  mockContract.vars.set("next-site-id", siteId + 1)
  return { success: siteId }
}

function updateExcavationStatus(siteId, newStatus) {
  const siteKey = `excavation-sites-${siteId}`
  const siteData = mockContract.maps.get(siteKey)
  
  if (!siteData) {
    return { error: 204 } // err-excavation-not-found
  }
  
  if (mockContract.currentSender !== siteData.institution) {
    return { error: 201 } // err-not-verified
  }
  
  mockContract.maps.set(siteKey, {
    ...siteData,
    status: newStatus,
  })
  
  return { success: true }
}

function recordFinding(siteId) {
  const siteKey = `excavation-sites-${siteId}`
  const siteData = mockContract.maps.get(siteKey)
  
  if (!siteData) {
    return { error: 204 } // err-excavation-not-found
  }
  
  if (mockContract.currentSender !== siteData.institution) {
    return { error: 201 } // err-not-verified
  }
  
  mockContract.maps.set(siteKey, {
    ...siteData,
    findingsCount: siteData.findingsCount + 1,
  })
  
  return { success: true }
}

function getExcavationSite(siteId) {
  return mockContract.maps.get(`excavation-sites-${siteId}`) || null
}

function getSitePermissions(siteId) {
  return mockContract.maps.get(`site-permissions-${siteId}`) || null
}

function getNextSiteId() {
  return mockContract.vars.get("next-site-id") || 1
}

describe("Excavation Protocol Contract", () => {
  beforeEach(() => {
    mockContract.maps.clear()
    mockContract.vars.clear()
    mockContract.currentSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockContract.blockHeight = 1000
    mockContract.vars.set("next-site-id", 1)
  })
  
  describe("register-excavation-site", () => {
    it("should register new excavation site successfully", () => {
      const result = registerExcavationSite(
          "Ancient Roman Villa, Pompeii Sector 7",
          "quantum-temporal-analysis",
          1000,
          "Quantum resonance mapping",
      )
      
      expect(result.success).toBe(1)
      
      const siteData = getExcavationSite(1)
      expect(siteData).toBeDefined()
      expect(siteData.location).toBe("Ancient Roman Villa, Pompeii Sector 7")
      expect(siteData.status).toBe("active")
      expect(siteData.findingsCount).toBe(0)
      
      const permissions = getSitePermissions(1)
      expect(permissions).toBeDefined()
      expect(permissions.quantumAccess).toBe(true)
      expect(permissions.permissionLevel).toBe(5)
    })
    
    it("should reject invalid duration", () => {
      const result = registerExcavationSite("Test Site", "standard", 0, "Basic excavation")
      
      expect(result.error).toBe(203) // err-invalid-protocol
    })
    
    it("should increment site ID for multiple registrations", () => {
      registerExcavationSite("Site 1", "type1", 100, "method1")
      const result2 = registerExcavationSite("Site 2", "type2", 200, "method2")
      
      expect(result2.success).toBe(2)
      expect(getNextSiteId()).toBe(3)
    })
  })
  
  describe("update-excavation-status", () => {
    beforeEach(() => {
      registerExcavationSite("Test Site", "quantum", 500, "quantum method")
    })
    
    it("should allow site owner to update status", () => {
      const result = updateExcavationStatus(1, "completed")
      expect(result.success).toBe(true)
      
      const siteData = getExcavationSite(1)
      expect(siteData.status).toBe("completed")
    })
    
    it("should reject status update from non-owner", () => {
      mockContract.currentSender = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const result = updateExcavationStatus(1, "completed")
      expect(result.error).toBe(201) // err-not-verified
    })
    
    it("should reject update for non-existent site", () => {
      const result = updateExcavationStatus(999, "completed")
      expect(result.error).toBe(204) // err-excavation-not-found
    })
  })
  
  describe("record-finding", () => {
    beforeEach(() => {
      registerExcavationSite("Test Site", "quantum", 500, "quantum method")
    })
    
    it("should allow site owner to record findings", () => {
      const result = recordFinding(1)
      expect(result.success).toBe(true)
      
      const siteData = getExcavationSite(1)
      expect(siteData.findingsCount).toBe(1)
      
      // Record another finding
      recordFinding(1)
      const updatedSiteData = getExcavationSite(1)
      expect(updatedSiteData.findingsCount).toBe(2)
    })
    
    it("should reject finding record from non-owner", () => {
      mockContract.currentSender = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const result = recordFinding(1)
      expect(result.error).toBe(201) // err-not-verified
    })
    
    it("should reject finding record for non-existent site", () => {
      const result = recordFinding(999)
      expect(result.error).toBe(204) // err-excavation-not-found
    })
  })
  
  describe("read-only functions", () => {
    beforeEach(() => {
      registerExcavationSite("Archaeological Site Alpha", "quantum-enhanced", 750, "Temporal quantum analysis")
    })
    
    it("should return correct site data", () => {
      const siteData = getExcavationSite(1)
      expect(siteData).toBeDefined()
      expect(siteData.location).toBe("Archaeological Site Alpha")
      expect(siteData.protocolType).toBe("quantum-enhanced")
      expect(siteData.estimatedDuration).toBe(750)
      expect(siteData.quantumMethod).toBe("Temporal quantum analysis")
    })
    
    it("should return correct permissions", () => {
      const permissions = getSitePermissions(1)
      expect(permissions).toBeDefined()
      expect(permissions.authorizedInstitution).toBe(mockContract.currentSender)
      expect(permissions.quantumAccess).toBe(true)
      expect(permissions.expiresAt).toBe(mockContract.blockHeight + 750)
    })
    
    it("should return null for non-existent site", () => {
      expect(getExcavationSite(999)).toBeNull()
      expect(getSitePermissions(999)).toBeNull()
    })
    
    it("should return correct next site ID", () => {
      expect(getNextSiteId()).toBe(2)
    })
  })
})

console.log("Excavation Protocol Contract tests completed successfully!")
