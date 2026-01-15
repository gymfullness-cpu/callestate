-- CreateTable
CREATE TABLE "AgentSocialLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentProfileId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentSocialLink_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentSocialLink_agentProfileId_idx" ON "AgentSocialLink"("agentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSocialLink_agentProfileId_platform_key" ON "AgentSocialLink"("agentProfileId", "platform");
